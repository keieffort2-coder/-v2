const pages = document.querySelectorAll(".page");
const appShell = document.querySelector(".app-shell");
const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageButtons = document.querySelectorAll("[data-page]");
const projectGrid = document.querySelector("#projectGrid");
const projectNameInput = document.querySelector("#projectNameInput");
const projectCodeInput = document.querySelector("#projectCodeInput");
const createProjectButton = document.querySelector("#createProject");
const cloneProjectButton = document.querySelector("#cloneProject");
const workspaceProjectName = document.querySelector("#workspaceProjectName");
const canvas = document.querySelector(".workspace-canvas");
const canvasContent = document.querySelector(".canvas-content");
const canvasToolbar = document.querySelector(".canvas-toolbar");
const connectorSvg = document.querySelector(".connectors");
const nodeTemplate = document.querySelector("#nodeTemplate");
const canvasContextMenu = document.querySelector("#canvasContextMenu");
const nodeContextMenu = document.querySelector("#nodeContextMenu");
const assetContextMenu = document.querySelector("#assetContextMenu");
const imageUploadContextMenu = document.querySelector("#imageUploadContextMenu");
const portConnectionContextMenu = document.querySelector("#portConnectionContextMenu");
const imageConfigPanel = document.querySelector("#imageConfigPanel");
const configNodeName = document.querySelector("#configNodeName");
const imagePromptInput = document.querySelector("#imagePromptInput");
const submitImageConfig = document.querySelector("#submitImageConfig");
const imageModelSelect = document.querySelector("#imageModelSelect");
const openImageOptions = document.querySelector("#openImageOptions");
const imageOptionsPopover = document.querySelector("#imageOptionsPopover");
const openReferencePicker = document.querySelector("#openReferencePicker");
const referencePicker = document.querySelector("#referencePicker");
const referenceList = document.querySelector("#referenceList");
const addLocalReference = document.querySelector("#addLocalReference");
const imageViewer = document.querySelector("#imageViewer");
const imageViewerImg = document.querySelector("#imageViewerImg");
const closeImageViewer = document.querySelector("#closeImageViewer");
const arrangeCanvasNodes = document.querySelector("#arrangeCanvasNodes");
const createFolderFromSelection = document.querySelector("#createFolderFromSelection");
const exitFolderCanvas = document.querySelector("#exitFolderCanvas");
const folderExitTop = document.querySelector("#folderExitTop");
const resetCanvasView = document.querySelector("#resetCanvasView");
const zoomCanvasOut = document.querySelector("#zoomCanvasOut");
const zoomCanvasIn = document.querySelector("#zoomCanvasIn");
const canvasZoomLabel = document.querySelector("#canvasZoomLabel");
let memoryComposer = document.querySelector("#memoryComposer");
let memoryInput = document.querySelector("#memoryInput");
let memoryType = document.querySelector("#memoryType");
let memoryList = document.querySelector("#memoryList");

const PROJECT_LIST_KEY = "aivideobox.projects.v2";
const PROJECT_CODE_INDEX_KEY = "aivideobox.projectCodes.v1";
const GLOBAL_MEMORY_KEY = "aivideobox.globalMemories.v1";
const IMAGE_OPTIONS_KEY = "aivideobox.imageOptions.v1";
const WORKSPACE_SIDE_STATE_KEY = "aivideobox.workspaceSidebarsHidden.v1";
const LOCAL_ASSETS_KEY = "aivideobox.localAssets.v1";
const TEMPLATE_LIBRARY_KEY = "aivideobox.templates.v1";
const SHARED_PROJECTS_API = "/api/shared-projects";
const SHARED_ASSETS_API = "/api/shared-assets";
const SHARED_TEMPLATES_API = "/api/shared-templates";
const AUTH_CONFIG_API = "/api/auth-config";
const IMAGE_DB_NAME = "aivideobox.images";
const IMAGE_STORE_NAME = "images";
const typeLabels = { text: "Text", image: "Image", video: "Video", folder: "Folder" };
const typeNames = { text: "文本", image: "图片", video: "视频", folder: "文件夹" };
const roleLabels = {
  general: "普通图",
  editBase: "编辑底图",
  structure: "渲染结构图",
  style: "风格参考图",
  output: "输出图",
};
const videoModeLabels = {
  "image-to-video": "图生视频",
  "text-to-video": "文生视频",
  "video-to-video": "视频参考转换",
};
const videoModelLabels = {
  "doubao-seedance-2.0": "Seedance2",
  "kling-motion-control": "kling3",
  "happyhorse-1.0": "happyhorse",
};
const videoAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const videoResolutions = ["480p", "720p", "1080p"];
const nodeDefaults = {
  text: "输入对话内容、brief 或 prompt。",
  image: "",
  video: "",
  folder: "双击进入文件夹画布。",
};

let currentProject = "";
let activeFolder = null;
let selectedNode = null;
let nodeCounter = 0;
let viewport = { x: 0, y: 0, scale: 1 };
let dragState = null;
let panState = null;
let pendingCanvasDrag = null;
let selectionBoxState = null;
let wireState = null;
let contextPoint = { x: 120, y: 120 };
let contextNode = null;
let contextAssetId = "";
let contextTemplateId = "";
let contextUploadNode = null;
let contextPort = null;
let configNode = null;
let imageViewerScale = 1;
let imageViewerSources = [];
let imageViewerIndex = 0;
let canvasDragDepth = 0;
const imageGenerationControllers = new Map();
const selectedNodes = new Set();
let conversationMemories = [];
let localAssets = [];
let platformSharedAssets = [];
let localTemplates = [];
let platformSharedTemplates = [];
let pendingDeletedProjectNames = [];
let supabaseClient = null;
let authSession = null;
let authReady = false;
let imageOptions = {
  purpose: "自定义",
  referenceMode: "structureStyle",
  imageRole: "general",
  quality: "high",
};
let isRestoring = false;
let workspaceSidebarsHidden = localStorage.getItem(WORKSPACE_SIDE_STATE_KEY) === "true";

connectorSvg?.setAttribute("viewBox", "0 0 5000 5000");
ensureMemoryUi();
applyWorkspaceSidebarsState();
initSupabaseAuth();

pageButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.addEventListener("click", (event) => {
  const saveTemplateButton = event.target.closest("[data-save-current-template]");
  if (saveTemplateButton) {
    saveCurrentProjectAsLocalTemplate();
    return;
  }

  const templateUseButton = event.target.closest("[data-use-template]");
  if (templateUseButton) {
    useTemplate(templateUseButton.dataset.useTemplate);
    return;
  }

  const templatePreviewButton = event.target.closest("[data-preview-template]");
  if (templatePreviewButton) {
    const template = getTemplateById(templatePreviewButton.dataset.previewTemplate);
    if (template) openTemplatePreview(template);
    return;
  }

  const templateDeleteButton = event.target.closest("[data-delete-template]");
  if (templateDeleteButton) {
    deleteLocalTemplate(templateDeleteButton.dataset.deleteTemplate);
    return;
  }

  const templateUnpublishButton = event.target.closest("[data-unpublish-template]");
  if (templateUnpublishButton) {
    pendingDeletedTemplateIds.add(templateUnpublishButton.dataset.unpublishTemplate);
    platformSharedTemplates = platformSharedTemplates.filter((template) => template.id !== templateUnpublishButton.dataset.unpublishTemplate);
    renderTemplatesPage();
    saveSharedTemplatesSoon();
    return;
  }

  const assetUseButton = event.target.closest("[data-use-asset]");
  if (assetUseButton) {
    const asset = getAssetById(assetUseButton.dataset.useAsset);
    if (asset) {
      if (!currentProject) {
        const name = createFreshProject("素材画布");
        openProject(name);
      }
      createNodeFromMemory(asset);
    }
    return;
  }

  const assetPreviewButton = event.target.closest("[data-preview-asset]");
  if (assetPreviewButton) {
    const asset = getAssetById(assetPreviewButton.dataset.previewAsset);
    if (asset) openAssetPreview(asset);
    return;
  }

  const assetDeleteButton = event.target.closest("[data-delete-asset]");
  if (assetDeleteButton) {
    deleteAssetFromLibrary(assetDeleteButton.dataset.deleteAsset);
    return;
  }

  const publishAssetButton = event.target.closest("[data-publish-asset]");
  if (publishAssetButton) {
    publishLocalAssetToPlatform(publishAssetButton.dataset.publishAsset);
    return;
  }

  const unpublishAssetButton = event.target.closest("[data-unpublish-asset]");
  if (unpublishAssetButton) {
    pendingDeletedAssetIds.add(unpublishAssetButton.dataset.unpublishAsset);
    platformSharedAssets = platformSharedAssets.filter((asset) => asset.id !== unpublishAssetButton.dataset.unpublishAsset);
    renderConversationMemories();
    renderAssetsPage();
    saveSharedAssetsSoon();
    return;
  }

  const pageButton = event.target.closest("[data-page]");
  if (!pageButton) return;
  event.preventDefault();
  showPage(pageButton.dataset.page);
});

document.addEventListener("contextmenu", (event) => {
  const templateCard = event.target.closest("[data-template-card]");
  if (templateCard) {
    event.preventDefault();
    contextTemplateId = templateCard.dataset.templateCard || "";
    syncTemplateContextMenu(getTemplateById(contextTemplateId));
    showMenu(ensureTemplateContextMenu(), event.clientX, event.clientY);
    return;
  }

  const assetCard = event.target.closest("[data-asset-card]");
  if (!assetCard || !assetContextMenu) return;
  event.preventDefault();
  contextAssetId = assetCard.dataset.assetCard || "";
  syncAssetContextMenu(getAssetById(contextAssetId));
  showMenu(assetContextMenu, event.clientX, event.clientY);
});

createProjectButton?.addEventListener("click", () => {
  const name = createFreshProject(projectNameInput.value.trim() || "未命名项目");
  projectNameInput.value = "";
  openProject(name);
});

cloneProjectButton?.addEventListener("click", () => {
  const code = normalizeProjectCode(projectCodeInput.value);
  if (!code) {
    markProjectCodeInput("请输入项目码");
    return;
  }
  const clonedName = cloneProjectByCode(code);
  if (!clonedName) {
    markProjectCodeInput("未找到项目码");
    return;
  }
  projectCodeInput.value = "";
  openProject(clonedName);
});

projectGrid?.addEventListener("click", (event) => {
  const card = event.target.closest(".project-card");
  if (!card) return;

  const name = card.dataset.project;
  if (event.target.closest(".project-name")) {
    startProjectNameEdit(card);
    return;
  }

  if (event.target.closest("[data-open-project]")) {
    openProject(name);
    return;
  }

  if (event.target.closest(".delete-project")) {
    deleteProject(name);
    return;
  }

  if (event.target.closest(".project-code")) {
    publishProjectCode(card);
    saveProjectList();
  }
});

document.addEventListener("submit", (event) => {
  if (!event.target.matches("#memoryComposer")) return;
  event.preventDefault();
  const content = memoryInput?.value.trim() || "";
  if (!currentProject) return;
  const memory = selectedNode
    ? createMemoryFromNode(selectedNode, content)
    : {
        id: createMemoryId(),
        type: memoryType?.value || "image",
        title: createMemoryTitle(content),
        content,
        createdAt: new Date().toISOString(),
  };
  if (!memory.content && !memory.nodeSnapshot) return;
  conversationMemories.unshift(memory);
  conversationMemories = uniqueMemories(conversationMemories);
  memoryInput.value = "";
  renderConversationMemories();
  renderAssetsPage();
  saveGlobalMemories();
  saveSharedAssetsSoon();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#memoryList")) return;
  const deleteButton = event.target.closest(".memory-delete");
  if (deleteButton) {
    event.stopPropagation();
    conversationMemories = conversationMemories.filter((memory) => memory.id !== deleteButton.dataset.memoryId);
    renderConversationMemories();
    renderAssetsPage();
    saveGlobalMemories();
    saveSharedAssetsSoon();
    return;
  }

  const item = event.target.closest(".chat-item");
  if (!item) return;
  memoryList.querySelectorAll(".chat-item").forEach((button) => button.classList.toggle("active", button === item));
  const memory = getMemoryById(item.dataset.memoryId) || {
    type: item.dataset.type || "text",
    title: item.dataset.title || "对话记忆",
    content: item.dataset.content || "",
  };
  createNodeFromMemory(memory);
});

document.addEventListener("dragstart", (event) => {
  const item = event.target.closest("#memoryList .chat-item");
  if (!item || !event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-aivideobox-memory", item.dataset.memoryId || "");
});

canvas?.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const port = event.target.closest(".node-port");
  const portNode = port?.closest(".node");
  if (portNode) {
    contextPort = port;
    contextNode = portNode;
    if (!selectedNodes.has(portNode)) selectNode(portNode);
    renderPortConnectionMenu(port);
    showMenu(portConnectionContextMenu, event.clientX, event.clientY);
    contextPort = port;
    contextNode = portNode;
    return;
  }

  const uploadWindow = event.target.closest(".image-upload-window");
  const uploadNode = uploadWindow?.closest(".node");
  if (uploadNode?.dataset.type === "image") {
    contextUploadNode = uploadNode;
    contextNode = uploadNode;
    if (!selectedNodes.has(uploadNode)) selectNode(uploadNode);
    showMenu(imageUploadContextMenu, event.clientX, event.clientY);
    contextUploadNode = uploadNode;
    contextNode = uploadNode;
    return;
  }

  const node = event.target.closest(".node");
  const canvasRect = canvasContent.getBoundingClientRect();
  contextPoint = {
    x: (event.clientX - canvasRect.left) / viewport.scale,
    y: (event.clientY - canvasRect.top) / viewport.scale,
  };

  if (node) {
    contextNode = node;
    if (!selectedNodes.has(node)) selectNode(node);
    syncNodeContextMenu(node);
    showMenu(nodeContextMenu, event.clientX, event.clientY);
    return;
  }

  contextNode = null;
  showMenu(canvasContextMenu, event.clientX, event.clientY);
});

canvasContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-create-type]");
  if (!button) return;

  const type = button.dataset.createType;
  const node = createNode({
    id: createNodeId(),
    type,
    title: `${typeNames[type]}节点`,
    content: nodeDefaults[type],
    x: contextPoint.x,
    y: contextPoint.y,
  });
  selectNode(node);
  hideMenus();
  saveCurrentProject();
});

nodeContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-action]");
  if (!button || !contextNode) return;

  const action = button.dataset.menuAction;
  if (action.startsWith("type-")) {
    const nextType = action.replace("type-", "");
    getActionNodes(contextNode).forEach((node) => setNodeType(node, nextType));
    saveCurrentProject();
  } else if (action === "delete") {
    if (selectedNodes.size > 1 && selectedNodes.has(contextNode)) {
      deleteSelectedNodes();
    } else {
      deleteNode(contextNode);
    }
  } else if (action === "duplicate") {
    getActionNodes(contextNode).forEach(duplicateNode);
  } else if (action === "save-asset") {
    saveNodesToAssetLibrary(getActionNodes(contextNode));
  } else if (action === "ungroup-folder") {
    ungroupFolderNode(contextNode);
  } else if (action === "run") {
    getActionNodes(contextNode).forEach(runNode);
  }
  hideMenus();
});

function syncNodeContextMenu(node) {
  const ungroupButton = nodeContextMenu?.querySelector('[data-menu-action="ungroup-folder"]');
  if (ungroupButton) ungroupButton.hidden = node?.dataset.type !== "folder" || Boolean(activeFolder);
}

imageUploadContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-upload-action]");
  if (!button || !contextUploadNode) return;
  event.preventDefault();
  event.stopPropagation();

  if (button.dataset.uploadAction === "replace") {
    contextUploadNode.querySelector(".node-file-input")?.click();
  }
  if (button.dataset.uploadAction === "delete") {
    clearUploadedImages(contextUploadNode);
  }
  hideMenus();
});

portConnectionContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-connection-index]");
  if (!button || !contextPort) return;
  event.preventDefault();
  event.stopPropagation();

  const connections = getConnectionsForPort(contextPort);
  const connection = connections[Number(button.dataset.connectionIndex)];
  if (connection?.path) {
    connection.path.remove();
    updateConnections();
    saveCurrentProject();
    refreshConnectionsSoon();
  }
  hideMenus();
});

assetContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-asset-action]");
  if (!button || !contextAssetId) return;
  event.preventDefault();
  event.stopPropagation();

  if (button.dataset.assetAction === "publish") {
    publishLocalAssetToPlatform(contextAssetId);
  }
  if (button.dataset.assetAction === "unpublish") {
    pendingDeletedAssetIds.add(contextAssetId);
    platformSharedAssets = platformSharedAssets.filter((asset) => asset.id !== contextAssetId);
    renderAssetsPage();
    saveSharedAssetsSoon();
  }
  hideMenus();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-action]");
  if (!button || !contextTemplateId) return;
  event.preventDefault();
  event.stopPropagation();
  if (button.dataset.templateAction === "publish") publishLocalTemplateToPlatform(contextTemplateId);
  if (button.dataset.templateAction === "unpublish") {
    pendingDeletedTemplateIds.add(contextTemplateId);
    platformSharedTemplates = platformSharedTemplates.filter((template) => template.id !== contextTemplateId);
    renderTemplatesPage();
    saveSharedTemplatesSoon();
  }
  hideMenus();
});

document.addEventListener("click", (event) => {
  const roleButton = event.target.closest(".image-role-button");
  if (roleButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleImageRoleMenu(roleButton.closest(".node"));
    return;
  }

  const roleOption = event.target.closest(".image-role-option");
  if (roleOption) {
    event.preventDefault();
    event.stopPropagation();
    const node = roleOption.closest(".node");
    setImageRole(node, roleOption.dataset.role);
    closeImageRoleMenus();
    return;
  }

  const previewImage = event.target.closest(".upload-preview img, .config-input-thumb img");
  if (previewImage) {
    event.preventDefault();
    event.stopPropagation();
    openImageViewer(previewImage.src, getViewerSourcesForImage(previewImage));
    return;
  }

  const historyButton = event.target.closest(".output-history-button");
  if (historyButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleOutputHistory(historyButton.closest(".node"));
    return;
  }

  if (!event.target.closest(".output-history-popover")) {
    closeOutputHistoryPopovers();
  }

  const customButton = event.target.closest(".node-custom-button");
  if (!customButton) return;
  const node = customButton.closest(".node");
  if (node?.dataset.type === "image" || node?.dataset.type === "video") {
    openImageConfig(node);
  }
});

closeImageViewer?.addEventListener("click", closeImageViewerPanel);

imageViewer?.addEventListener("click", (event) => {
  if (event.target === imageViewer) closeImageViewerPanel();
});

imageViewer?.addEventListener("click", (event) => {
  const zoomButton = event.target.closest("[data-image-zoom]");
  const stepButton = event.target.closest("[data-image-step]");
  if (zoomButton) {
    event.preventDefault();
    if (zoomButton.dataset.imageZoom === "in") setImageViewerScale(imageViewerScale + 0.25);
    if (zoomButton.dataset.imageZoom === "out") setImageViewerScale(imageViewerScale - 0.25);
    if (zoomButton.dataset.imageZoom === "reset") setImageViewerScale(1);
  }
  if (stepButton) {
    event.preventDefault();
    stepImageViewer(Number(stepButton.dataset.imageStep));
  }
});

imageViewer?.addEventListener(
  "wheel",
  (event) => {
    if (!imageViewer.classList.contains("show")) return;
    event.preventDefault();
    setImageViewerScale(imageViewerScale + (event.deltaY < 0 ? 0.15 : -0.15));
  },
  { passive: false },
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector("#assetPreviewModal")?.classList.contains("show")) {
    closeAssetPreview();
    return;
  }
  if (!imageViewer?.classList.contains("show")) return;
  if (event.key === "Escape") {
    closeImageViewerPanel();
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepImageViewer(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    stepImageViewer(1);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".context-menu")) hideMenus();
  if (!event.target.closest(".image-role-picker")) closeImageRoleMenus();
  closeFloatingPanelsOnOutsideClick(event);

  const title = event.target.closest(".node-title strong");
  if (title) {
    event.stopPropagation();
    startTitleEdit(title);
    return;
  }

  const node = event.target.closest(".node");
  if (node && !event.target.closest(".node-port")) {
    selectNode(node);
  }
});

document.addEventListener("dblclick", (event) => {
  const folderNode = event.target.closest('.node[data-type="folder"]');
  if (!folderNode) return;
  event.preventDefault();
  event.stopPropagation();
  enterFolder(folderNode);
});

function closeFloatingPanelsOnOutsideClick(event) {
  const clickedConfig =
    event.target.closest("#imageConfigPanel") ||
    event.target.closest("#imageOptionsPopover") ||
    event.target.closest("#referencePicker") ||
    event.target.closest(".node-custom-button");

  if (!clickedConfig && imageConfigPanel.classList.contains("show")) {
    closeImageConfig();
    return;
  }

  if (
    imageOptionsPopover.classList.contains("show") &&
    !event.target.closest("#imageOptionsPopover") &&
    !event.target.closest("#openImageOptions")
  ) {
    imageOptionsPopover.classList.remove("show");
    imageOptionsPopover.setAttribute("aria-hidden", "true");
  }

  if (
    referencePicker.classList.contains("show") &&
    !event.target.closest("#referencePicker") &&
    !event.target.closest("#openReferencePicker")
  ) {
    referencePicker.classList.remove("show");
    referencePicker.setAttribute("aria-hidden", "true");
  }
}

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-video-setting]")) {
    if (configNode?.dataset.type === "video") {
      persistVideoSettingsFromPanel(configNode);
      saveCurrentProject();
    }
    return;
  }

  if (event.target.matches("[data-video-asset]")) {
    handleVideoAssetUpload(event.target);
    return;
  }

  if (event.target.matches(".node-type-select")) {
    const node = event.target.closest(".node");
    if (node?.dataset.type === "image" && event.target.dataset.roleSelect === "true") {
      setImageRole(node, event.target.value);
    } else if (node?.dataset.type === "video" && event.target.dataset.videoModeSelect === "true") {
      setVideoMode(node, event.target.value);
    } else {
      setNodeType(node, event.target.value);
    }
    saveCurrentProject();
  }
});

submitImageConfig?.addEventListener("click", () => {
  if (!configNode) return;
  if (configNode.dataset.type === "video") {
    const description = configNode.querySelector(".node-description");
    description.textContent = imagePromptInput.value;
    persistVideoSettingsFromPanel(configNode);
    configNode.dataset.videoModel = normalizeVideoModelValue(imageModelSelect?.value);
    saveCurrentProject();
    runVideoGeneration(configNode);
    return;
  }
  if (imageGenerationControllers.has(configNode.id)) {
    cancelImageGeneration(configNode);
    return;
  }
  const description = configNode.querySelector(".node-description");
  description.textContent = imagePromptInput.value;
  configNode.dataset.imagePurpose = imageOptions.purpose;
  configNode.dataset.referenceMode = imageOptions.referenceMode;
  configNode.dataset.imageRole = imageOptions.imageRole;
  delete configNode.dataset.imageRatio;
  delete configNode.dataset.imageResolution;
  configNode.dataset.imageQuality = imageOptions.quality;
  configNode.dataset.imageModel = imageModelSelect?.value || "gpt-image-2-official";
  configNode.dataset.apimartChannel = "b";
  saveCurrentProject();
  runImageGeneration(configNode);
});

openImageOptions?.addEventListener("click", () => {
  imageOptionsPopover.classList.toggle("show");
  imageOptionsPopover.setAttribute("aria-hidden", imageOptionsPopover.classList.contains("show") ? "false" : "true");
});

imageOptionsPopover?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-value]");
  if (!button) return;
  const group = button.closest("[data-option-group]").dataset.optionGroup;
  imageOptions[group] = button.dataset.value;
  button.closest(".option-grid").querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
  persistImageConfigOptions();
  syncImageOptionsSummary();
  saveImageOptions();
});


imageModelSelect?.addEventListener("change", () => {
  if (!configNode) return;
  if (configNode.dataset.type === "video") {
    configNode.dataset.videoModel = normalizeVideoModelValue(imageModelSelect.value);
    saveCurrentProject();
    return;
  }
  configNode.dataset.imageModel = imageModelSelect.value || "gpt-image-2-official";
  saveCurrentProject();
});

openReferencePicker?.addEventListener("click", () => {
  if (!configNode) return;
  renderReferencePicker();
  referencePicker.classList.add("show");
  referencePicker.setAttribute("aria-hidden", "false");
});

referenceList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-reference-node]");
  if (!item) return;
  imagePromptInput.value += `\n引用画布节点：${item.dataset.referenceNode}`;
  const sourceNode = [...canvasContent.querySelectorAll(".node")].find((node) => {
    return node.querySelector(".node-title strong")?.textContent === item.dataset.referenceNode;
  });
  const sourceImages = getNodeImageSources(sourceNode);
  if (configNode && sourceImages.length) {
    configNode.dataset.referenceImageUrls = JSON.stringify(sourceImages);
    configNode.dataset.referenceImageDataUrl = sourceImages[0];
    configNode.dataset.referenceFileName = item.dataset.referenceNode;
  }
  referencePicker.classList.remove("show");
  referencePicker.setAttribute("aria-hidden", "true");
  saveCurrentProject();
});

addLocalReference?.addEventListener("change", async () => {
  const file = addLocalReference.files?.[0];
  if (!file) return;
  imagePromptInput.value += `\n参考本地文件：${file.name}`;
  if (configNode && file.type.startsWith("image/")) {
    configNode.dataset.referenceFileName = file.name;
    const url = await uploadImageFile(file);
    const current = parseJsonArray(configNode.dataset.referenceImageUrls);
    const next = uniqueValues([...current, url]);
    configNode.dataset.referenceImageUrls = JSON.stringify(next);
    configNode.dataset.referenceImageDataUrl = next[0] || "";
  } else if (configNode && file.type.startsWith("video/")) {
    configNode.dataset.referenceFileName = file.name;
    const url = await uploadMediaFile(file);
    const current = parseJsonArray(configNode.dataset.referenceVideoUrls);
    const next = uniqueValues([...current, url]);
    configNode.dataset.referenceVideoUrls = JSON.stringify(next);
    configNode.dataset.referenceVideoUrl = next[0] || "";
  }
  referencePicker.classList.remove("show");
  referencePicker.setAttribute("aria-hidden", "true");
  saveCurrentProject();
});

async function handleVideoAssetUpload(input) {
  if (!configNode || configNode.dataset.type !== "video") return;
  const file = input.files?.[0];
  if (!file) return;
  const slot = input.dataset.videoAsset;
  const label = input.closest(".video-asset-picker")?.querySelector("small");
  if (label) label.textContent = "上传中...";

  try {
    const url = file.type.startsWith("image/") ? await uploadImageFile(file) : await uploadMediaFile(file);
    if (slot === "firstFrame") {
      configNode.dataset.videoFirstFrameUrl = url;
      configNode.dataset.referenceImageUrls = JSON.stringify(uniqueValues([url, ...parseJsonArray(configNode.dataset.referenceImageUrls)]));
    } else if (slot === "lastFrame") {
      configNode.dataset.videoLastFrameUrl = url;
      configNode.dataset.referenceImageUrls = JSON.stringify(uniqueValues([...parseJsonArray(configNode.dataset.referenceImageUrls), url]));
    } else if (slot === "referenceVideo") {
      configNode.dataset.referenceVideoUrl = url;
      configNode.dataset.referenceVideoUrls = JSON.stringify(uniqueValues([url, ...parseJsonArray(configNode.dataset.referenceVideoUrls)]));
    } else if (slot === "referenceAudio") {
      configNode.dataset.videoReferenceAudioUrl = url;
      configNode.dataset.videoReferenceAudioUrls = JSON.stringify(uniqueValues([url, ...parseJsonArray(configNode.dataset.videoReferenceAudioUrls)]));
    }
    if (label) label.textContent = file.name;
    renderConfigInputThumbnails(configNode);
    saveCurrentProject();
  } catch (error) {
    if (label) label.textContent = `上传失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    input.value = "";
  }
}

document.addEventListener("input", (event) => {
  if (!event.target.matches(".text-input, .mini-textarea, .text-brief-field")) return;
  const node = event.target.closest(".node");
  const description = node?.querySelector(".node-description");
  if (description) description.textContent = getNodeContent(node);
  saveCurrentProject();
});

document.addEventListener("change", (event) => {
  if (!event.target.matches(".node-file-input")) return;
  const node = event.target.closest(".node");
  const files = [...(event.target.files || [])];
  if (!node || !files.length) return;

  if (node.dataset.type === "image") {
    uploadFilesToImageNode(node, files);
    return;
  }

  if (node.dataset.type === "video") {
    uploadFilesToVideoNode(node, files);
    return;
  }
});

canvas?.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer || (!hasDraggedMediaFiles(event.dataTransfer) && !hasDraggedMemory(event.dataTransfer))) return;
  event.preventDefault();
  canvasDragDepth += 1;
  canvas.classList.add("drag-over");
});

canvas?.addEventListener("dragover", (event) => {
  if (!event.dataTransfer || (!hasDraggedMediaFiles(event.dataTransfer) && !hasDraggedMemory(event.dataTransfer))) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  canvas.classList.add("drag-over");
});

canvas?.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer || (!hasDraggedMediaFiles(event.dataTransfer) && !hasDraggedMemory(event.dataTransfer))) return;
  canvasDragDepth = Math.max(0, canvasDragDepth - 1);
  if (!canvasDragDepth) canvas.classList.remove("drag-over");
});

canvas?.addEventListener("drop", (event) => {
  const memoryId = event.dataTransfer?.getData("application/x-aivideobox-memory");
  if (memoryId) {
    const memory = getMemoryById(memoryId);
    if (memory) {
      event.preventDefault();
      canvasDragDepth = 0;
      canvas.classList.remove("drag-over");
      const point = clientPointToWorldPoint(event.clientX, event.clientY);
      createNodeFromMemory(memory, point);
    }
    return;
  }
  const imageFiles = getImageFilesFromDataTransfer(event.dataTransfer);
  const videoFiles = getVideoFilesFromDataTransfer(event.dataTransfer);
  if (!imageFiles.length && !videoFiles.length) return;
  event.preventDefault();
  canvasDragDepth = 0;
  canvas.classList.remove("drag-over");
  if (videoFiles.length) {
    createVideoInputNodeFromDrop(videoFiles, event.clientX, event.clientY);
    return;
  }
  createImageInputNodeFromDrop(imageFiles, event.clientX, event.clientY);
});

document.addEventListener(
  "mousedown",
  (event) => {
    if (event.button !== 0) return;
    const port = event.target.closest(".node-port");
    if (!port) return;
    const node = port.closest(".node");
    if (!node) return;

    event.preventDefault();
    event.stopPropagation();
    startWire(node, port, event);
  },
  true,
);

canvas?.addEventListener("mousedown", (event) => {
  if (event.target.closest(".node-port, button, select, textarea")) return;
  if (event.button === 1) {
    event.preventDefault();
    panState = {
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
    canvas.classList.add("panning");
    return;
  }
  if (event.button !== 0) return;

  const node = event.target.closest(".node");
  if (!node) {
    pendingCanvasDrag = {
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
      startedAt: Date.now(),
      mode: "",
    };
    return;
  }

  const rect = node.getBoundingClientRect();
  if (!selectedNodes.has(node)) selectNode(node);
  dragState = {
    node,
    nodes: selectedNodes.size ? [...selectedNodes] : [node],
    offsetX: (event.clientX - rect.left) / viewport.scale,
    offsetY: (event.clientY - rect.top) / viewport.scale,
    startX: event.clientX,
    startY: event.clientY,
    origins: new Map((selectedNodes.size ? [...selectedNodes] : [node]).map((item) => [
      item,
      {
        x: Number(item.dataset.x) || 0,
        y: Number(item.dataset.y) || 0,
      },
    ])),
  };
});

canvas?.addEventListener("auxclick", (event) => {
  if (event.button === 1) event.preventDefault();
});

document.addEventListener("mousemove", (event) => {
  if (wireState) {
    updateTempWire(event);
    highlightNearestPort(event);
    return;
  }

  if (panState) {
    viewport.x = panState.originX + event.clientX - panState.startX;
    viewport.y = panState.originY + event.clientY - panState.startY;
    applyViewport();
    return;
  }

  if (pendingCanvasDrag) {
    const dx = event.clientX - pendingCanvasDrag.startX;
    const dy = event.clientY - pendingCanvasDrag.startY;
    const distance = Math.hypot(dx, dy);
    if (!pendingCanvasDrag.mode && distance > 4) {
      pendingCanvasDrag.mode = "select";
      startSelectionBoxFromPoint(pendingCanvasDrag.startX, pendingCanvasDrag.startY);
    }
    if (pendingCanvasDrag.mode === "pan") {
      viewport.x = pendingCanvasDrag.originX + dx;
      viewport.y = pendingCanvasDrag.originY + dy;
      applyViewport();
      return;
    }
    if (pendingCanvasDrag.mode === "select") {
      updateSelectionBox(event);
      return;
    }
  }

  if (selectionBoxState) {
    updateSelectionBox(event);
    return;
  }

  if (!dragState) return;
  const dx = (event.clientX - dragState.startX) / viewport.scale;
  const dy = (event.clientY - dragState.startY) / viewport.scale;
  dragState.nodes.forEach((node) => {
    const origin = dragState.origins.get(node);
    moveNode(node, origin.x + dx, origin.y + dy);
  });
  updateConnections();
});

document.addEventListener("mouseup", (event) => {
  if (wireState) {
    finishWire(event);
    return;
  }

  const finishedSelection = pendingCanvasDrag?.mode === "select" && selectionBoxState;
  if (finishedSelection) finishSelectionBox(event);
  if (pendingCanvasDrag && !pendingCanvasDrag.mode) selectNode(null);
  pendingCanvasDrag = null;
  if (!finishedSelection && selectionBoxState) finishSelectionBox(event);
  if (dragState) saveCurrentProject();
  dragState = null;
  panState = null;
  canvas?.classList.remove("panning");
});

canvas?.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    zoomCanvas(event.deltaY > 0 ? 0.9 : 1.1, event.clientX, event.clientY);
  },
  { passive: false },
);

canvasToolbar?.addEventListener("mousedown", (event) => {
  event.stopPropagation();
});

arrangeCanvasNodes?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  arrangeNodes();
});

createFolderFromSelection?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  createFolderFromSelectedNodes();
});

exitFolderCanvas?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  exitFolder();
});

folderExitTop?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  exitFolder();
});

resetCanvasView?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  resetViewport();
});

zoomCanvasOut?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  zoomCanvas(0.9);
});

zoomCanvasIn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  zoomCanvas(1.1);
});

window.addEventListener(
  "keydown",
  (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveCurrentProject();
      saveProjectList();
    }

  if (event.key === "Escape") {
    hideMenus();
    closeImageConfig();
    selectNode(null);
  }

    if ((event.key === "Backspace" || event.key === "Delete") && selectedNodes.size) {
      if (isTextEditingTarget(event.target)) return;
      event.preventDefault();
      deleteSelectedNodes();
    }
  },
  true,
);

window.addEventListener("beforeunload", () => {
  saveCurrentProject();
  saveProjectList();
});

function showPage(name) {
  if (!name) return;
  pages.forEach((page) => page.classList.toggle("active", page.id === `page-${name}`));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.page === name));
  applyWorkspaceSidebarsState();
  if (name === "projects") loadSharedProjectList();
  if (name === "assets") {
    loadSharedAssets();
    renderAssetsPage();
  }
  if (name === "templates") {
    loadSharedTemplates();
    renderTemplatesPage();
  }
}

function upsertProject(name) {
  if (!projectGrid.querySelector(`[data-project="${cssEscape(name)}"]`)) {
    addProjectCard(name);
  }
  updateProjectGridState();
  saveProjectList();
}

function createFreshProject(baseName) {
  const name = uniqueProjectName(baseName);
  localStorage.removeItem(projectKey(name));
  localStorage.setItem(projectKey(name), JSON.stringify({ nodes: [], connections: [] }));
  addProjectCard(name);
  updateProjectGridState();
  saveSharedProject(name, { nodes: [], connections: [] });
  saveProjectList();
  setTimeout(saveProjectList, 800);
  return name;
}

function uniqueProjectName(baseName) {
  const existing = new Set([...projectGrid.querySelectorAll(".project-card")].map((card) => card.dataset.project));
  if (!existing.has(baseName)) return baseName;
  let index = 2;
  while (existing.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function startProjectNameEdit(card) {
  const titleEl = card.querySelector(".project-name");
  if (!titleEl || card.querySelector(".project-name-input")) return;

  const oldName = card.dataset.project || titleEl.textContent.trim();
  const input = document.createElement("input");
  input.className = "project-name-input";
  input.value = oldName;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const rawName = input.value.trim();
    let nextName = rawName || oldName;
    if (nextName !== oldName) {
      nextName = uniqueProjectNameExcept(nextName, oldName);
      renameProject(oldName, nextName, card);
    }

    const strong = document.createElement("strong");
    strong.className = "project-name";
    strong.title = "点击重命名";
    strong.textContent = nextName;
    input.replaceWith(strong);
  };

  input.addEventListener("blur", commit, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.value = oldName;
      input.blur();
    }
  });
}

function uniqueProjectNameExcept(baseName, ignoredName) {
  const existing = new Set(
    [...projectGrid.querySelectorAll(".project-card")]
      .map((card) => card.dataset.project)
      .filter((name) => name !== ignoredName),
  );
  if (!existing.has(baseName)) return baseName;
  let index = 2;
  while (existing.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function renameProject(oldName, nextName, card) {
  if (!oldName || !nextName || oldName === nextName) return;
  const oldKey = projectKey(oldName);
  const nextKey = projectKey(nextName);
  const savedProject = localStorage.getItem(oldKey);
  if (savedProject !== null) {
    localStorage.setItem(nextKey, savedProject);
    localStorage.removeItem(oldKey);
  }
  card.dataset.project = nextName;
  const openButton = card.querySelector("[data-open-project]");
  if (openButton) openButton.dataset.openProject = nextName;
  if (currentProject === oldName) {
    currentProject = nextName;
    workspaceProjectName.textContent = nextName;
  }
  if (card.dataset.code) {
    const index = readProjectCodeIndex();
    index[card.dataset.code] = nextName;
    writeProjectCodeIndex(index);
  }
  saveProjectList();
  if (savedProject !== null) {
    try {
      saveSharedProject(nextName, JSON.parse(savedProject));
      deleteSharedProject(oldName);
    } catch (error) {
      console.warn("Shared project rename sync failed", error);
    }
  }
}

function addProjectCard(name, date = new Date().toLocaleDateString("zh-CN"), code = "") {
  const projectCode = normalizeProjectCode(code);
  const thumbnail = getProjectThumbnailFromLocal(name);
  const stats = getProjectStorageStats(name);
  const card = document.createElement("article");
  card.className = "project-card";
  card.dataset.project = name;
  if (projectCode) card.dataset.code = projectCode;
  card.innerHTML = `
    <div class="project-row">
      <div class="folder-icon"><svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v10H3z" /></svg></div>
      <div>
        <strong class="project-name" title="点击重命名">${escapeHtml(name)}</strong>
        <span>${escapeHtml(date)}</span>
        <small>${escapeHtml(`节点 ${stats.nodes} / 备份 ${stats.backupNodes}`)}</small>
      </div>
    </div>
    <div class="project-thumb ${thumbnail ? "has-image" : ""}" data-project-thumb>
      ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="">` : `<span>暂无预览图</span>`}
    </div>
    <button class="open-canvas" data-open-project="${escapeHtml(name)}" type="button">开始项目</button>
    <button class="project-code" type="button">${escapeHtml(projectCode ? `项目码 ${projectCode}` : "生成项目码")}</button>
    <button class="delete-project" type="button">删除</button>
  `;
  projectGrid.prepend(card);
  updateProjectGridState();
}

function getProjectStorageStats(name) {
  const data = readJson(projectKey(name), null);
  const backup = readJson(`${projectKey(name)}.backup`, null);
  return {
    nodes: Array.isArray(data?.nodes) ? data.nodes.length : 0,
    backupNodes: Array.isArray(backup?.nodes) ? backup.nodes.length : 0,
  };
}

function getProjectThumbnailFromLocal(name) {
  return getProjectThumbnail(readJson(projectKey(name), null));
}

function getProjectThumbnail(data) {
  if (!data || !Array.isArray(data.nodes)) return "";
  const candidates = [];
  data.nodes.forEach((node) => collectNodeThumbnailCandidates(node, candidates));
  return candidates.find(isRemoteImageUrl) || candidates.find((value) => typeof value === "string" && value.startsWith("data:image/")) || "";
}

function collectNodeThumbnailCandidates(node, candidates) {
  if (!node) return;
  candidates.push(
    node.generatedImageUrl,
    ...arrayOrEmpty(node.generatedImageUrls),
    ...arrayOrEmpty(node.imageUrls),
    node.imageDataUrl,
    ...arrayOrEmpty(node.referenceImageUrls),
    node.referenceImageDataUrl,
  );
  arrayOrEmpty(node.folderNodes).forEach((child) => collectNodeThumbnailCandidates(child, candidates));
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function updateProjectCardThumbnail(name, data) {
  const card = projectGrid.querySelector(`[data-project="${cssEscape(name)}"]`);
  const thumb = card?.querySelector("[data-project-thumb]");
  if (!thumb) return;
  const image = getProjectThumbnail(data);
  thumb.classList.toggle("has-image", Boolean(image));
  thumb.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="">` : "<span>暂无预览图</span>";
}

function saveProjectList() {
  const projects = [...projectGrid.querySelectorAll(".project-card")].map((card) => ({
    name: card.dataset.project,
    date: card.querySelector(".project-row span")?.textContent || "",
    code: card.dataset.code || normalizeProjectCode(card.querySelector(".project-code")?.textContent) || "",
  }));
  try {
    localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Project list save failed", error);
  }
  saveSharedProjectList(projects);
}

function loadProjectList() {
  const saved = readJson(PROJECT_LIST_KEY, []);
  const projects = repairProjectListFromStorage(Array.isArray(saved) ? saved : []);
  projectGrid.innerHTML = "";
  projects.reverse().forEach((project) => addProjectCard(project.name, project.date, project.code));
  try {
    localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects.slice().reverse()));
  } catch (error) {
    console.warn("Project list repair save failed", error);
  }
  rebuildProjectCodeIndex();
  updateProjectGridState();
  loadSharedProjectList();
}

function repairProjectListFromStorage(projects) {
  const byName = new Map(projects.map((project) => [String(project?.name || ""), project]));
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("aivideobox.project.v2:")) continue;
    const name = key.slice("aivideobox.project.v2:".length).replace(/\.backup$/, "");
    if (!name || byName.has(name)) continue;
    const data = readJson(key, null);
    if (!data || !Array.isArray(data.nodes)) continue;
    byName.set(name, {
      name,
      date: new Date().toLocaleDateString("zh-CN"),
      code: "",
    });
  }
  return [...byName.values()].filter((project) => project?.name);
}

function startSharedProjectAutoRefresh() {
  window.addEventListener("focus", () => {
    if (shouldAutoRefreshSharedProjects()) loadSharedProjectList();
  });
}

function shouldAutoRefreshSharedProjects() {
  return (
    !document.hidden &&
    document.querySelector("#page-projects")?.classList.contains("active") &&
    !document.querySelector(".project-name-input")
  );
}

async function loadSharedProjectList() {
  try {
    const response = await fetch(SHARED_PROJECTS_API, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const sharedProjects = Array.isArray(result.projects) ? result.projects : [];
    const deletedNames = uniqueValues([...pendingDeletedProjectNames]);
    const localProjects = readJson(PROJECT_LIST_KEY, []);
    const projects = mergeProjectLists(
      Array.isArray(localProjects) ? localProjects : [],
      sharedProjects,
      deletedNames,
    );
    if (!projects.length) {
      return;
    }
    projectGrid.innerHTML = "";
    projects.slice().reverse().forEach((project) => addProjectCard(project.name, project.date, project.code));
    localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(projects));
    rebuildProjectCodeIndex();
    updateProjectGridState();
    refreshProjectThumbnails(projects);
    if (JSON.stringify(projects) !== JSON.stringify(sharedProjects)) {
      saveSharedProjectList(projects);
      projects.forEach((project) => {
        const data = readJson(projectKey(project.name), null);
        if (hasProjectNodes(data)) saveSharedProject(project.name, data);
      });
    }
  } catch (error) {
    console.warn("Shared project list load failed", error);
  }
}

function refreshProjectThumbnails(projects) {
  projects.forEach((project) => {
    if (!project?.name) return;
    loadSharedProjectThumbnail(project.name);
  });
}

async function loadSharedProjectThumbnail(name) {
  try {
    const response = await fetch(`${SHARED_PROJECTS_API}?name=${encodeURIComponent(name)}`, { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json();
    if (result?.data) {
      updateProjectCardThumbnail(name, result.data);
    }
  } catch (error) {
    console.warn("Shared project thumbnail load failed", error);
  }
}

async function saveSharedProjectList(projects) {
  try {
    const deletedNames = uniqueValues([...pendingDeletedProjectNames]);
    pendingDeletedProjectNames = [];
    const response = await fetch(SHARED_PROJECTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "list", projects, deletedNames }),
    });
    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result.projects)) {
        localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(result.projects));
      }
    }
  } catch (error) {
    console.warn("Shared project list save failed", error);
  }
}

function mergeProjectLists(localProjects = [], sharedProjects = [], deletedNames = []) {
  const deleted = new Set(deletedNames.map((name) => String(name || "")));
  const byName = new Map();
  [...sharedProjects, ...localProjects].forEach((project) => {
    const name = String(project?.name || "").trim();
    if (!name || deleted.has(name)) return;
    byName.set(name, {
      name,
      date: project.date || new Date().toLocaleDateString("zh-CN"),
      code: project.code || "",
    });
  });
  return [...byName.values()];
}

function deleteProject(name) {
  const card = projectGrid.querySelector(`[data-project="${cssEscape(name)}"]`);
  const code = card?.dataset.code;
  card?.remove();
  localStorage.removeItem(projectKey(name));
  pendingDeletedProjectNames.push(name);
  deleteSharedProject(name);
  if (code) removeProjectCode(code);
  if (currentProject === name) {
    currentProject = "";
    clearCanvas();
  }
  updateProjectGridState();
  saveProjectList();
}

function publishProjectCode(card) {
  if (!card) return "";
  if (currentProject === card.dataset.project) saveCurrentProject();
  const code = card.dataset.code || createUniqueProjectCode();
  card.dataset.code = code;
  const button = card.querySelector(".project-code");
  if (button) button.textContent = `项目码 ${code}`;
  const index = readProjectCodeIndex();
  index[code] = card.dataset.project;
  writeProjectCodeIndex(index);
  return code;
}

function cloneProjectByCode(code) {
  const sourceName = findProjectNameByCode(code);
  if (!sourceName) return "";
  if (currentProject === sourceName) saveCurrentProject();
  const sourceData = localStorage.getItem(projectKey(sourceName));
  if (!sourceData) return "";
  const name = uniqueProjectName(`${sourceName} 副本`);
  localStorage.setItem(projectKey(name), sourceData);
  addProjectCard(name, new Date().toLocaleDateString("zh-CN"));
  updateProjectGridState();
  saveProjectList();
  return name;
}

function findProjectNameByCode(code) {
  const normalized = normalizeProjectCode(code);
  if (!normalized) return "";
  const card = [...projectGrid.querySelectorAll(".project-card")].find((item) => item.dataset.code === normalized);
  if (card) return card.dataset.project || "";
  return readProjectCodeIndex()[normalized] || "";
}

function createUniqueProjectCode() {
  const used = new Set([
    ...Object.keys(readProjectCodeIndex()),
    ...[...projectGrid.querySelectorAll(".project-card")].map((card) => card.dataset.code).filter(Boolean),
  ]);
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (used.has(code));
  return code;
}

function normalizeProjectCode(value = "") {
  return String(value).replace(/^项目码\s*/i, "").replace(/\s+/g, "").toUpperCase();
}

function markProjectCodeInput(message) {
  if (!projectCodeInput) return;
  projectCodeInput.value = "";
  projectCodeInput.placeholder = message;
  projectCodeInput.classList.add("invalid");
  setTimeout(() => {
    projectCodeInput.classList.remove("invalid");
    projectCodeInput.placeholder = "输入项目码";
  }, 1400);
}

function readProjectCodeIndex() {
  const index = readJson(PROJECT_CODE_INDEX_KEY, {});
  return index && typeof index === "object" && !Array.isArray(index) ? index : {};
}

function writeProjectCodeIndex(index) {
  try {
    localStorage.setItem(PROJECT_CODE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error("Project code index save failed", error);
  }
}

function removeProjectCode(code) {
  const index = readProjectCodeIndex();
  delete index[normalizeProjectCode(code)];
  writeProjectCodeIndex(index);
}

function rebuildProjectCodeIndex() {
  const index = readProjectCodeIndex();
  [...projectGrid.querySelectorAll(".project-card")].forEach((card) => {
    if (card.dataset.code) index[card.dataset.code] = card.dataset.project;
  });
  writeProjectCodeIndex(index);
}

function updateProjectGridState() {
  projectGrid?.classList.toggle("empty", !projectGrid.querySelector(".project-card"));
}

function openProject(name) {
  if (currentProject) saveCurrentProject();
  activeFolder = null;
  ensureMemoryUi();
  loadGlobalMemories();
  currentProject = name;
  workspaceProjectName.textContent = name;
  document.querySelectorAll(".project-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.project === name);
  });
  clearCanvas();
  restoreProject(name);
  syncFolderUi();
  showPage("workspace");
  refreshConnectionsSoon();
}

function ensureMemoryUi() {
  const panel = document.querySelector(".conversation-panel");
  if (!panel) return;
  panel.style.display = "flex";

  if (!memoryComposer) {
    memoryComposer = document.createElement("form");
    memoryComposer.className = "memory-composer";
    memoryComposer.id = "memoryComposer";
    memoryComposer.innerHTML = `
      <textarea id="memoryInput" placeholder="记录一条对话、需求或提示词..."></textarea>
      <div class="memory-actions">
        <select id="memoryType">
          <option value="image">图片</option>
          <option value="text">文本</option>
          <option value="video">视频</option>
        </select>
        <button class="yellow-button" type="submit">保存记忆</button>
      </div>
    `;
    const chatList = panel.querySelector(".chat-list");
    panel.insertBefore(memoryComposer, chatList || null);
  }

  if (!memoryList) {
    memoryList = panel.querySelector(".chat-list") || document.createElement("div");
    memoryList.classList.add("chat-list");
    memoryList.id = "memoryList";
    if (!memoryList.parentElement) panel.appendChild(memoryList);
  }

  memoryInput = document.querySelector("#memoryInput");
  memoryType = document.querySelector("#memoryType");
  ensureWorkspaceSidebarsToggle();
}

function ensureWorkspaceSidebarsToggle() {
  if (!appShell || appShell.querySelector("#toggleWorkspaceSidebars")) return;
  const button = document.createElement("button");
  button.id = "toggleWorkspaceSidebars";
  button.type = "button";
  button.className = "workspace-side-toggle";
  appShell.appendChild(button);
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    workspaceSidebarsHidden = !workspaceSidebarsHidden;
    localStorage.setItem(WORKSPACE_SIDE_STATE_KEY, String(workspaceSidebarsHidden));
    applyWorkspaceSidebarsState();
    refreshConnectionsSoon();
  });
  applyWorkspaceSidebarsState();
}

function applyWorkspaceSidebarsState() {
  const layout = document.querySelector(".workspace-layout");
  const workspaceActive = document.querySelector("#page-workspace")?.classList.contains("active");
  appShell?.classList.toggle("workspace-sidebars-hidden", workspaceSidebarsHidden && workspaceActive);
  layout?.classList.toggle("sidebars-hidden", workspaceSidebarsHidden);
  const toggle = document.querySelector("#toggleWorkspaceSidebars");
  if (toggle) {
    toggle.classList.toggle("is-hidden-state", workspaceSidebarsHidden);
    toggle.hidden = !workspaceActive;
    toggle.textContent = workspaceSidebarsHidden ? "显示左侧" : "隐藏左侧";
    toggle.title = workspaceSidebarsHidden ? "显示目录和保存记忆" : "隐藏目录和保存记忆";
  }
}

function createNodeFromMemory(memory, point = null) {
  const offset = Math.min(420, conversationMemories.length * 18);
  const center = point || getCanvasViewportCenterPoint();
  if (memory.nodeSnapshot) {
    const snapshot = {
      ...memory.nodeSnapshot,
      id: createNodeId(),
      title: memory.title || memory.nodeSnapshot.title || "记忆节点",
      x: center.x - 129,
      y: center.y - 110,
    };
    const node = createNode(snapshot);
    hydrateRestoredNodeData(node, snapshot);
    selectNode(node);
    saveCurrentProject();
    refreshConnectionsSoon();
    return node;
  }
  const node = createNode({
    id: createNodeId(),
    type: memory.type || "text",
    title: memory.title || `${typeNames[memory.type] || "文本"}记忆`,
    content: memory.content || "",
    x: center.x - 129 + offset,
    y: center.y - 110 + offset,
  });
  selectNode(node);
  saveCurrentProject();
  return node;
}

function createMemoryFromNode(node, note = "") {
  const snapshot = createAssetSnapshotFromNode(node);
  const title = note.trim() || snapshot.title || node.querySelector(".node-title strong")?.textContent || "节点记忆";
  return {
    id: createMemoryId(),
    type: snapshot.type || node.dataset.type || "text",
    title: createMemoryTitle(title),
    content: note.trim() || snapshot.content || snapshot.title || "",
    nodeSnapshot: snapshot,
    assetKind: "node",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createAssetSnapshotFromNode(node) {
  const snapshot = serializeNodes([node])[0];
  if (node.dataset.imageDataUrl) {
    snapshot.imageDataUrl = node.dataset.imageDataUrl;
    snapshot.imageDataKey = "";
  }
  if (node.dataset.referenceImageDataUrl) {
    snapshot.referenceImageDataUrl = node.dataset.referenceImageDataUrl;
    snapshot.referenceImageDataKey = "";
  }
  return snapshot;
}

function saveNodesToAssetLibrary(nodes) {
  const validNodes = nodes.filter((node) => node?.isConnected);
  if (!validNodes.length) return;
  const assets = validNodes.map((node) => createMemoryFromNode(node));
  localAssets = uniqueMemories([...assets, ...localAssets]);
  renderConversationMemories();
  renderAssetsPage();
  saveGlobalMemories();
  validNodes.forEach((node) => {
    ensureNodeStatus(node).textContent = validNodes.length > 1 ? "已批量上传到素材库。" : "已上传到素材库。";
  });
}

function publishLocalAssetToPlatform(id) {
  const asset = localAssets.find((item) => item.id === id);
  if (!asset) return;
  const sharedAsset = {
    ...asset,
    source: "platform",
    updatedAt: new Date().toISOString(),
  };
  platformSharedAssets = uniqueMemories([sharedAsset, ...platformSharedAssets]);
  renderAssetsPage();
  saveSharedAssetsSoon();
}

function deleteAssetFromLibrary(id) {
  localAssets = localAssets.filter((asset) => asset.id !== id);
  conversationMemories = conversationMemories.filter((memory) => memory.id !== id);
  renderConversationMemories();
  renderAssetsPage();
  saveGlobalMemories();
}

function syncAssetContextMenu(asset) {
  const publishButton = assetContextMenu?.querySelector('[data-asset-action="publish"]');
  const unpublishButton = assetContextMenu?.querySelector('[data-asset-action="unpublish"]');
  const isPlatform = platformSharedAssets.some((item) => item.id === asset?.id);
  if (publishButton) publishButton.hidden = !asset || isPlatform || !localAssets.some((item) => item.id === asset.id);
  if (unpublishButton) unpublishButton.hidden = !asset || !isPlatform;
}

function stripMediaFromNodeSnapshot(snapshot) {
  const clean = { ...snapshot };
  delete clean.fileName;
  delete clean.imageUrls;
  delete clean.imageDataKey;
  delete clean.imageDataUrl;
  delete clean.referenceImageUrls;
  delete clean.referenceImageDataKey;
  delete clean.referenceImageDataUrl;
  delete clean.referenceFileName;
  delete clean.generatedImageUrl;
  delete clean.generatedImageUrls;
  delete clean.folderNodes;
  delete clean.folderConnections;
  return clean;
}

function hydrateRestoredNodeData(node, saved) {
  node.dataset.imagePurpose = saved.imagePurpose || "自定义";
  node.dataset.referenceMode = saved.referenceMode || "structureStyle";
  node.dataset.imageRole = saved.imageRole || "general";
  node.dataset.imageQuality = saved.imageQuality || "high";
  node.dataset.imageModel = normalizeImageModel(saved.imageModel || "gpt-image-2-official");
  node.dataset.apimartChannel = "b";
  if (saved.fileName) node.dataset.fileName = saved.fileName;
  if (Array.isArray(saved.imageUrls)) node.dataset.imageUrls = JSON.stringify(saved.imageUrls);
  if (saved.imageDataUrl) node.dataset.imageDataUrl = saved.imageDataUrl;
  if (Array.isArray(saved.referenceImageUrls)) node.dataset.referenceImageUrls = JSON.stringify(saved.referenceImageUrls);
  if (saved.referenceImageDataUrl) node.dataset.referenceImageDataUrl = saved.referenceImageDataUrl;
  if (saved.referenceFileName) node.dataset.referenceFileName = saved.referenceFileName;
  if (saved.generatedImageUrl) node.dataset.generatedImageUrl = saved.generatedImageUrl;
  if (Array.isArray(saved.generatedImageUrls)) node.dataset.generatedImageUrls = JSON.stringify(saved.generatedImageUrls);
  if (Array.isArray(saved.folderNodes)) node.dataset.folderNodes = JSON.stringify(saved.folderNodes);
  if (Array.isArray(saved.folderConnections)) node.dataset.folderConnections = JSON.stringify(saved.folderConnections);
  if (saved.tone) node.dataset.tone = saved.tone;
  setNodeType(node, saved.type, saved.content);
  renderNodeImagePreview(node);
  if (saved.imageDataKey) {
    loadProjectImage(saved.imageDataKey).then((value) => {
      if (!value) return;
      node.dataset.imageDataUrl = value;
      renderNodeImagePreview(node);
    });
  }
  if (saved.referenceImageDataKey) {
    loadProjectImage(saved.referenceImageDataKey).then((value) => {
      if (value) node.dataset.referenceImageDataUrl = value;
    });
  }
}

function getCanvasViewportCenterPoint() {
  const rect = canvas?.getBoundingClientRect();
  if (!rect) return { x: 180, y: 160 };
  return {
    x: (rect.width / 2 - viewport.x) / viewport.scale,
    y: (rect.height / 2 - viewport.y) / viewport.scale,
  };
}

function renderConversationMemories() {
  if (!memoryList) return;
  const memories = conversationMemories.length ? conversationMemories : getDefaultMemories();
  memoryList.innerHTML = memories
    .map((memory, index) => {
      const isSaved = conversationMemories.some((item) => item.id === memory.id);
      const typeLabel = typeNames[memory.type] || "文本";
      const memoryKind = memory.nodeSnapshot ? "节点配置" : typeLabel;
      return `
        <button class="chat-item ${index === 0 ? "active" : ""}" type="button" draggable="true" data-memory-id="${escapeHtml(memory.id || "")}" data-type="${escapeHtml(memory.type)}" data-title="${escapeHtml(memory.title)}" data-content="${escapeHtml(memory.content)}">
          <strong>${escapeHtml(memory.title)}</strong>
          <small>${escapeHtml(memoryKind)} / ${escapeHtml(memory.content || memory.nodeSnapshot?.content || "")}</small>
          ${isSaved ? `<span class="memory-delete" role="button" tabindex="0" data-memory-id="${escapeHtml(memory.id)}">×</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function getMemoryById(id) {
  return conversationMemories.find((memory) => memory.id === id) || getDefaultMemories().find((memory) => memory.id === id) || null;
}

function getAssetById(id) {
  return localAssets.find((asset) => asset.id === id) || platformSharedAssets.find((asset) => asset.id === id) || getMemoryById(id);
}

function loadGlobalMemories() {
  const saved = readJson(GLOBAL_MEMORY_KEY, []);
  conversationMemories = Array.isArray(saved) ? saved : [];
  const savedAssets = readJson(LOCAL_ASSETS_KEY, null);
  localAssets = Array.isArray(savedAssets) ? savedAssets : conversationMemories.filter((asset) => asset?.assetKind === "node");
}

function saveGlobalMemories() {
  try {
    localStorage.setItem(GLOBAL_MEMORY_KEY, JSON.stringify(conversationMemories));
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(localAssets));
  } catch (error) {
    console.error("Global memory save failed", error);
  }
}

function renderAssetsPage() {
  const section = document.querySelector(".my-assets");
  if (!section) return;
  let list = section.querySelector(".my-assets-list");
  if (!list) {
    list = document.createElement("div");
    list.className = "my-assets-list";
    section.appendChild(list);
  }
  const empty = section.querySelector(".empty-assets");
  empty?.toggleAttribute("hidden", localAssets.length > 0);
  list.innerHTML = localAssets.map((asset) => renderAssetCard(asset, "local")).join("");

  const platformSection = document.querySelector(".platform-assets");
  if (!platformSection) return;
  let platformList = platformSection.querySelector(".platform-assets-list");
  if (!platformList) {
    platformList = document.createElement("div");
    platformList.className = "platform-assets-list my-assets-list";
    platformSection.appendChild(platformList);
  }
  let platformEmpty = platformSection.querySelector(".empty-platform-assets");
  if (!platformEmpty) {
    platformEmpty = document.createElement("div");
    platformEmpty.className = "empty-assets empty-platform-assets";
    platformEmpty.innerHTML = "<div>P</div><strong>暂无平台素材</strong><span>在我的素材卡片上右键，选择上传到平台后会显示在这里。</span>";
    platformSection.insertBefore(platformEmpty, platformList);
  }
  platformEmpty.toggleAttribute("hidden", platformSharedAssets.length > 0);
  platformList.innerHTML = platformSharedAssets.map((asset) => renderAssetCard(asset, "platform")).join("");
}

function renderAssetCard(asset, scope) {
  const typeLabel = asset.nodeSnapshot ? "节点配置" : typeNames[asset.type] || "文本";
  const preview = getAssetPreview(asset);
  const isPlatform = scope === "platform";
  return `
    <article class="asset-card project-card" data-asset-card="${escapeHtml(asset.id)}" data-asset-scope="${escapeHtml(scope)}">
      <div class="project-row">
        <div class="folder-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z" /><path d="M7 7V5h10v2" /></svg></div>
        <div>
          <strong>${escapeHtml(asset.title || "未命名素材")}</strong>
          <span>${escapeHtml(typeLabel)}</span>
          <small>${escapeHtml(getAssetMeta(asset, scope))}</small>
        </div>
      </div>
      <div class="project-thumb asset-thumb ${preview ? "has-image" : ""}">
        ${renderAssetPreview(asset, preview)}
      </div>
      <div class="asset-card-actions">
        <button type="button" data-preview-asset="${escapeHtml(asset.id)}">预览</button>
        <button class="open-canvas" type="button" data-use-asset="${escapeHtml(asset.id)}">上传画布</button>
        ${
          isPlatform
            ? `<button class="delete-project" type="button" data-unpublish-asset="${escapeHtml(asset.id)}">移出平台</button>`
            : `<button class="delete-project" type="button" data-delete-asset="${escapeHtml(asset.id)}">删除</button>`
        }
      </div>
    </article>
  `;
}

function renderAssetPreview(asset, preview) {
  if (preview) return `<img src="${escapeHtml(preview)}" alt="">`;
  const video = getAssetVideoPreview(asset);
  if (video) return `<video src="${escapeHtml(video)}" muted controls playsinline></video>`;
  return `<span>${escapeHtml(asset.content || asset.nodeSnapshot?.content || "已保存的画布节点素材。")}</span>`;
}

function getAssetMeta(asset, scope = "local") {
  if (asset.nodeSnapshot) {
    const snapshot = asset.nodeSnapshot;
    const childCount = Array.isArray(snapshot.folderNodes) ? snapshot.folderNodes.length : 0;
    const base = childCount ? `完整节点 / 子节点 ${childCount}` : "完整节点";
    return scope === "platform" ? `平台素材 / ${base}` : `本地素材 / ${base}`;
  }
  return scope === "platform" ? "平台素材" : "本地素材";
}

function getAssetPreview(asset) {
  const candidates = [];
  if (asset.nodeSnapshot) collectNodeThumbnailCandidates(asset.nodeSnapshot, candidates);
  return candidates.find(isRemoteImageUrl) || candidates.find((value) => typeof value === "string" && value.startsWith("data:image/")) || "";
}

function getAssetVideoPreview(asset) {
  const node = asset.nodeSnapshot;
  if (!node) return "";
  const candidates = [
    node.generatedVideoUrl,
    ...arrayOrEmpty(node.generatedVideoUrls),
    ...arrayOrEmpty(node.videoUrls),
    node.videoDataUrl,
    node.referenceVideoUrl,
    ...arrayOrEmpty(node.referenceVideoUrls),
  ];
  return candidates.find(Boolean) || "";
}

function openAssetPreview(asset) {
  const modal = ensureAssetPreviewModal();
  modal.querySelector(".asset-preview-body").innerHTML = renderAssetPreviewDetails(asset);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function ensureAssetPreviewModal() {
  let modal = document.querySelector("#assetPreviewModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "assetPreviewModal";
  modal.className = "asset-preview-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="asset-preview-panel" role="dialog" aria-modal="true">
      <div class="asset-preview-head">
        <strong>素材预览</strong>
        <button type="button" data-close-asset-preview>关闭</button>
      </div>
      <div class="asset-preview-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-asset-preview]")) closeAssetPreview();
  });
  return modal;
}

function closeAssetPreview() {
  const modal = document.querySelector("#assetPreviewModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

function renderAssetPreviewDetails(asset) {
  const node = asset.nodeSnapshot || {};
  const images = getAssetImageSources(asset);
  const videos = getAssetVideoSources(asset);
  const params = getAssetNodeParams(node);
  return `
    <section class="asset-preview-summary">
      <div>
        <small>${escapeHtml(asset.source === "platform" ? "平台素材" : "本地素材")}</small>
        <h2>${escapeHtml(asset.title || node.title || "未命名素材")}</h2>
        <p>${escapeHtml(asset.content || node.content || "暂无文本内容。")}</p>
      </div>
      <dl>
        <div><dt>节点类型</dt><dd>${escapeHtml(typeNames[node.type || asset.type] || node.type || asset.type || "未知")}</dd></div>
        <div><dt>素材编号</dt><dd>${escapeHtml(asset.id || "-")}</dd></div>
        <div><dt>更新时间</dt><dd>${escapeHtml(formatAssetTime(asset.updatedAt || asset.createdAt))}</dd></div>
      </dl>
    </section>
    ${renderAssetMediaSection("图片", images, "image")}
    ${renderAssetMediaSection("视频", videos, "video")}
    <section class="asset-preview-section">
      <h3>节点参数</h3>
      <div class="asset-param-grid">
        ${params.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("") || "<p>暂无参数。</p>"}
      </div>
    </section>
    <section class="asset-preview-section">
      <h3>完整节点信息</h3>
      <pre>${escapeHtml(JSON.stringify(asset.nodeSnapshot || asset, null, 2))}</pre>
    </section>
  `;
}

function getAssetImageSources(asset) {
  const node = asset.nodeSnapshot;
  if (!node) return [];
  const images = [
    node.generatedImageUrl,
    ...arrayOrEmpty(node.generatedImageUrls),
    ...arrayOrEmpty(node.imageUrls),
    node.imageDataUrl,
    ...arrayOrEmpty(node.referenceImageUrls),
    node.referenceImageDataUrl,
  ];
  arrayOrEmpty(node.folderNodes).forEach((child) => {
    images.push(...getAssetImageSources({ nodeSnapshot: child }));
  });
  return uniqueValues(images.filter(Boolean));
}

function getAssetVideoSources(asset) {
  const node = asset.nodeSnapshot;
  if (!node) return [];
  const videos = [
    node.generatedVideoUrl,
    ...arrayOrEmpty(node.generatedVideoUrls),
    ...arrayOrEmpty(node.videoUrls),
    node.videoDataUrl,
    node.referenceVideoUrl,
    ...arrayOrEmpty(node.referenceVideoUrls),
  ];
  arrayOrEmpty(node.folderNodes).forEach((child) => {
    videos.push(...getAssetVideoSources({ nodeSnapshot: child }));
  });
  return uniqueValues(videos.filter(Boolean));
}

function renderAssetMediaSection(title, sources, type) {
  return `
    <section class="asset-preview-section">
      <h3>${escapeHtml(title)}</h3>
      ${
        sources.length
          ? `<div class="asset-preview-media-grid">${sources.map((source) => renderAssetMediaItem(source, type)).join("")}</div>`
          : "<p>暂无媒体。</p>"
      }
    </section>
  `;
}

function renderAssetMediaItem(source, type) {
  if (type === "video") {
    return `<video src="${escapeHtml(source)}" controls muted playsinline></video>`;
  }
  return `<img src="${escapeHtml(source)}" alt="">`;
}

function getAssetNodeParams(node) {
  if (!node || !Object.keys(node).length) return [];
  const rows = [
    ["标题", node.title],
    ["内容", node.content],
    ["图片模型", node.imageModel],
    ["图片用途", node.imagePurpose],
    ["参考模式", node.referenceMode],
    ["图片角色", node.imageRole],
    ["图片质量", node.imageQuality],
    ["视频模型", node.videoModel],
    ["视频模式", node.videoMode],
    ["时长", node.videoDuration],
    ["宽高比", node.videoAspectRatio],
    ["分辨率", node.videoResolution],
    ["随机种子", node.videoSeed],
    ["生成音频", node.videoGenerateAudio === true ? "是" : node.videoGenerateAudio === false ? "否" : ""],
    ["返回尾帧", node.videoReturnLastFrame === true ? "是" : node.videoReturnLastFrame === false ? "否" : ""],
    ["联网搜索", node.videoWebSearch === true ? "是" : node.videoWebSearch === false ? "否" : ""],
  ];
  return rows.filter(([, value]) => value !== undefined && value !== null && String(value) !== "").map(([label, value]) => [label, String(value)]);
}

function formatAssetTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN");
}

async function initSupabaseAuth() {
  createAuthOverlay();
  try {
    const response = await fetch(AUTH_CONFIG_API, { cache: "no-store" });
    const config = await readResponseJson(response);
    if (!config.enabled) {
      setAuthStatus("登录未启用：请先配置 Supabase 环境变量。");
      lockAppForAuth(true);
      return;
    }
    if (!window.supabase?.createClient) {
      setAuthStatus("Supabase SDK 加载失败，请检查网络。");
      lockAppForAuth(true);
      return;
    }
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    authSession = data.session || null;
    authReady = true;
    syncAuthUi();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      authSession = session || null;
      syncAuthUi();
    });
  } catch (error) {
    setAuthStatus(`登录初始化失败：${error instanceof Error ? error.message : String(error)}`);
    lockAppForAuth(true);
  }
}

function createAuthOverlay() {
  if (document.querySelector("#authOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "authOverlay";
  overlay.className = "auth-overlay";
  overlay.innerHTML = `
    <form class="auth-card" id="authForm">
      <span class="kicker">ACCOUNT</span>
      <h1>AIVideoBox 登录</h1>
      <p>登录后进入工作台、素材库和模板库。</p>
      <label>
        <span>邮箱</span>
        <input id="authEmail" type="email" autocomplete="email" required />
      </label>
      <label>
        <span>密码</span>
        <input id="authPassword" type="password" autocomplete="current-password" required minlength="6" />
      </label>
      <div class="auth-actions">
        <button class="yellow-button" type="submit" data-auth-mode="signin">登录</button>
        <button class="subtle-button" type="button" data-auth-mode="signup">注册</button>
      </div>
      <small id="authStatus">正在检查登录状态...</small>
    </form>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#authForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await signInWithPassword();
  });
  overlay.querySelector('[data-auth-mode="signup"]')?.addEventListener("click", signUpWithPassword);
  ensureAuthSignOutButton();
}

function ensureAuthSignOutButton() {
  if (document.querySelector("#authSignOut")) return;
  const button = document.createElement("button");
  button.id = "authSignOut";
  button.className = "auth-signout";
  button.type = "button";
  button.textContent = "退出登录";
  button.hidden = true;
  button.addEventListener("click", async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  });
  document.body.appendChild(button);
}

async function signInWithPassword() {
  if (!supabaseClient) {
    setAuthStatus("登录服务还没初始化，请刷新页面或检查 Supabase 环境变量。");
    return;
  }
  const credentials = getAuthCredentials();
  if (!credentials) return;
  setAuthBusy(true);
  setAuthStatus("正在登录...");
  try {
    const { error } = await supabaseClient.auth.signInWithPassword(credentials);
    if (error) {
      setAuthStatus(`登录失败：${error.message}`);
      return;
    }
    setAuthStatus("登录成功。");
  } finally {
    setAuthBusy(false);
  }
}

async function signUpWithPassword() {
  if (!supabaseClient) {
    setAuthStatus("注册服务还没初始化，请刷新页面或检查 Supabase 环境变量。");
    return;
  }
  const credentials = getAuthCredentials();
  if (!credentials) return;
  setAuthBusy(true);
  setAuthStatus("正在注册...");
  try {
    const { data, error } = await supabaseClient.auth.signUp(credentials);
    if (error) {
      setAuthStatus(`注册失败：${error.message}`);
      return;
    }
    if (data.session) {
      setAuthStatus("注册成功，已自动登录。");
      return;
    }
    setAuthStatus("注册成功。如果 Supabase 开启了邮件确认，请先去邮箱确认后再登录。");
  } finally {
    setAuthBusy(false);
  }
}

function getAuthCredentials() {
  const emailInput = document.querySelector("#authEmail");
  const passwordInput = document.querySelector("#authPassword");
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  if (!email) {
    setAuthStatus("请输入邮箱。");
    emailInput?.focus();
    return null;
  }
  if (!password) {
    setAuthStatus("请输入密码。");
    passwordInput?.focus();
    return null;
  }
  if (password.length < 6) {
    setAuthStatus("密码至少需要 6 位。");
    passwordInput?.focus();
    return null;
  }
  return { email, password };
}

function setAuthBusy(isBusy) {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.disabled = isBusy;
  });
}

function syncAuthUi() {
  lockAppForAuth(!authSession);
  const signOut = document.querySelector("#authSignOut");
  if (signOut) signOut.hidden = !authSession;
  if (authSession?.user?.email) setAuthStatus(`已登录：${authSession.user.email}`);
}

function lockAppForAuth(locked) {
  document.body.classList.toggle("auth-locked", locked);
  const overlay = document.querySelector("#authOverlay");
  if (overlay) overlay.hidden = !locked;
}

function setAuthStatus(message) {
  const status = document.querySelector("#authStatus");
  if (status) status.textContent = message;
}

function loadTemplates() {
  const saved = readJson(TEMPLATE_LIBRARY_KEY, []);
  localTemplates = Array.isArray(saved) ? saved : [];
}

function saveTemplates() {
  try {
    localStorage.setItem(TEMPLATE_LIBRARY_KEY, JSON.stringify(localTemplates));
  } catch (error) {
    console.error("Template save failed", error);
  }
}

async function saveCurrentProjectAsLocalTemplate() {
  if (!currentProject) return;
  saveCurrentProject();
  const source = readJson(projectKey(currentProject), serializeCanvasData());
  const data = structuredClone(source || { nodes: [], connections: [] });
  await inlineProjectNodeImages(data.nodes);
  const template = {
    id: createTemplateId(),
    source: "local",
    title: `${currentProject} 模板`,
    description: `来自工作台项目：${currentProject}`,
    projectName: currentProject,
    data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localTemplates = uniqueTemplates([template, ...localTemplates]);
  saveTemplates();
  renderTemplatesPage();
}

function renderTemplatesPage() {
  const page = document.querySelector("#page-templates");
  if (!page) return;
  page.innerHTML = `
    <div class="assets-header">
      <div>
        <span class="kicker">TEMPLATES</span>
        <h1>模板库</h1>
        <p>保存完整工作台画布为本地模板；确认可复用后，再右键上传到平台模板。</p>
      </div>
      <button class="subtle-button" data-page="projects" type="button">返回工作台</button>
    </div>
    <div class="assets-actions">
      <button class="yellow-button" data-save-current-template type="button">+ 保存当前项目为模板</button>
    </div>
    <section class="my-assets template-section">
      <h2>本地模板</h2>
      <p>只保存在当前浏览器，不会自动共享。</p>
      <div class="empty-assets local-template-empty" ${localTemplates.length ? "hidden" : ""}>
        <div>T</div>
        <strong>还没有本地模板</strong>
        <span>打开一个工作台项目后，点击上方按钮保存完整画布。</span>
      </div>
      <div class="template-grid my-assets-list">${localTemplates.map((template) => renderTemplateCard(template, "local")).join("")}</div>
    </section>
    <section class="platform-assets template-section">
      <h2>平台模板</h2>
      <p>上传到平台后，其他电脑和账号也能复用。</p>
      <div class="empty-assets platform-template-empty" ${platformSharedTemplates.length ? "hidden" : ""}>
        <div>P</div>
        <strong>暂无平台模板</strong>
        <span>在本地模板卡片上右键，选择上传到平台。</span>
      </div>
      <div class="template-grid my-assets-list">${platformSharedTemplates.map((template) => renderTemplateCard(template, "platform")).join("")}</div>
    </section>
  `;
}

function renderTemplateCard(template, scope) {
  const stats = getTemplateStats(template);
  const thumb = getProjectThumbnail(template.data);
  const isPlatform = scope === "platform";
  return `
    <article class="asset-card project-card template-card" data-template-card="${escapeHtml(template.id)}" data-template-scope="${escapeHtml(scope)}">
      <div class="project-row">
        <div class="folder-icon"><svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg></div>
        <div>
          <strong>${escapeHtml(template.title || "未命名模板")}</strong>
          <span>${escapeHtml(isPlatform ? "平台模板" : "本地模板")}</span>
          <small>${escapeHtml(`节点 ${stats.nodes} / 连接 ${stats.connections}`)}</small>
        </div>
      </div>
      <div class="project-thumb asset-thumb ${thumb ? "has-image" : ""}">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : `<span>${escapeHtml(template.description || "完整画布模板。")}</span>`}
      </div>
      <div class="asset-card-actions">
        <button type="button" data-preview-template="${escapeHtml(template.id)}">预览</button>
        <button class="open-canvas" type="button" data-use-template="${escapeHtml(template.id)}">使用模板</button>
        ${
          isPlatform
            ? `<button class="delete-project" type="button" data-unpublish-template="${escapeHtml(template.id)}">移出平台</button>`
            : `<button class="delete-project" type="button" data-delete-template="${escapeHtml(template.id)}">删除</button>`
        }
      </div>
    </article>
  `;
}

function getTemplateStats(template) {
  return {
    nodes: Array.isArray(template?.data?.nodes) ? template.data.nodes.length : 0,
    connections: Array.isArray(template?.data?.connections) ? template.data.connections.length : 0,
  };
}

function getTemplateById(id) {
  return localTemplates.find((template) => template.id === id) || platformSharedTemplates.find((template) => template.id === id) || null;
}

function useTemplate(id) {
  const template = getTemplateById(id);
  if (!template?.data) return;
  const name = createFreshProject(template.title || "模板项目");
  const data = structuredClone(template.data);
  localStorage.setItem(projectKey(name), JSON.stringify(data));
  updateProjectCardThumbnail(name, data);
  saveSharedProject(name, data);
  openProject(name);
}

function deleteLocalTemplate(id) {
  localTemplates = localTemplates.filter((template) => template.id !== id);
  saveTemplates();
  renderTemplatesPage();
}

async function publishLocalTemplateToPlatform(id) {
  const template = localTemplates.find((item) => item.id === id);
  if (!template) return;
  const shared = {
    ...template,
    source: "platform",
    updatedAt: new Date().toISOString(),
  };
  platformSharedTemplates = uniqueTemplates([shared, ...platformSharedTemplates]);
  renderTemplatesPage();
  saveSharedTemplatesSoon();
}

function openTemplatePreview(template) {
  const stats = getTemplateStats(template);
  const previewAsset = {
    id: template.id,
    source: template.source,
    title: template.title,
    content: template.description || `节点 ${stats.nodes} / 连接 ${stats.connections}`,
    nodeSnapshot: {
      type: "folder",
      title: template.title,
      content: template.description,
      folderNodes: template.data?.nodes || [],
      folderConnections: template.data?.connections || [],
    },
    updatedAt: template.updatedAt,
    createdAt: template.createdAt,
  };
  openAssetPreview(previewAsset);
}

function uniqueTemplates(templates) {
  const seen = new Set();
  return templates.filter((template) => {
    const id = String(template?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function createTemplateId() {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureTemplateContextMenu() {
  let menu = document.querySelector("#templateContextMenu");
  if (menu) return menu;
  menu = document.createElement("div");
  menu.id = "templateContextMenu";
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-hidden", "true");
  menu.innerHTML = `
    <div class="context-title">模板操作</div>
    <button type="button" data-template-action="publish">上传到平台</button>
    <button type="button" data-template-action="unpublish">移出平台</button>
  `;
  document.body.appendChild(menu);
  return menu;
}

function syncTemplateContextMenu(template) {
  const menu = ensureTemplateContextMenu();
  const publishButton = menu.querySelector('[data-template-action="publish"]');
  const unpublishButton = menu.querySelector('[data-template-action="unpublish"]');
  const isPlatform = platformSharedTemplates.some((item) => item.id === template?.id);
  if (publishButton) publishButton.hidden = !template || isPlatform || !localTemplates.some((item) => item.id === template.id);
  if (unpublishButton) unpublishButton.hidden = !template || !isPlatform;
}

let sharedTemplatesSaveTimer = null;
const pendingDeletedTemplateIds = new Set();

function saveSharedTemplatesSoon() {
  clearTimeout(sharedTemplatesSaveTimer);
  sharedTemplatesSaveTimer = setTimeout(saveSharedTemplates, 900);
}

async function loadSharedTemplates() {
  try {
    const response = await fetch(SHARED_TEMPLATES_API, { cache: "no-store" });
    const result = await readResponseJson(response);
    if (!response.ok || result.disabled || !Array.isArray(result.templates)) return;
    platformSharedTemplates = uniqueTemplates(result.templates.filter((template) => !pendingDeletedTemplateIds.has(template?.id)));
    renderTemplatesPage();
  } catch (error) {
    console.warn("Shared templates load failed", error);
  }
}

async function saveSharedTemplates() {
  if (!platformSharedTemplates.length && !pendingDeletedTemplateIds.size) return;
  try {
    const response = await fetch(SHARED_TEMPLATES_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: platformSharedTemplates, deletedIds: [...pendingDeletedTemplateIds] }),
    });
    const result = await readResponseJson(response);
    if (!response.ok || result.disabled) return;
    pendingDeletedTemplateIds.clear();
    if (Array.isArray(result.templates)) {
      platformSharedTemplates = uniqueTemplates(result.templates);
      renderTemplatesPage();
    }
  } catch (error) {
    console.warn("Shared templates save failed", error);
  }
}

let sharedAssetsSaveTimer = null;
const pendingDeletedAssetIds = new Set();

function saveSharedAssetsSoon() {
  clearTimeout(sharedAssetsSaveTimer);
  sharedAssetsSaveTimer = setTimeout(saveSharedAssets, 900);
}

async function loadSharedAssets() {
  try {
    const response = await fetch(SHARED_ASSETS_API, { cache: "no-store" });
    const result = await readResponseJson(response);
    if (!response.ok || result.disabled || !Array.isArray(result.assets)) return;
    const remoteAssets = result.assets.filter((asset) => !pendingDeletedAssetIds.has(asset?.id));
    platformSharedAssets = uniqueMemories(remoteAssets);
    renderAssetsPage();
  } catch (error) {
    console.warn("Shared assets load failed", error);
  }
}

async function saveSharedAssets() {
  if (!platformSharedAssets.length && !pendingDeletedAssetIds.size) return;
  try {
    const response = await fetch(SHARED_ASSETS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: platformSharedAssets, deletedIds: [...pendingDeletedAssetIds] }),
    });
    const result = await readResponseJson(response);
    if (!response.ok || result.disabled) return;
    pendingDeletedAssetIds.clear();
    if (Array.isArray(result.assets)) {
      platformSharedAssets = uniqueMemories(result.assets);
      renderAssetsPage();
    }
  } catch (error) {
    console.warn("Shared assets save failed", error);
  }
}

function migrateProjectMemoriesToGlobal(memories) {
  if (!Array.isArray(memories) || !memories.length) return;
  const existing = readJson(GLOBAL_MEMORY_KEY, []);
  const merged = uniqueMemories([...(Array.isArray(existing) ? existing : []), ...memories]);
  conversationMemories = merged;
  saveGlobalMemories();
}

function uniqueMemories(memories) {
  const seen = new Set();
  return memories.filter((memory) => {
    const key = memory.id || `${memory.type}:${memory.title}:${memory.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDefaultMemories() {
  return [
    {
      id: "default-scene-image",
      type: "image",
      title: "场景重建图片",
      content: "完全参考输入图的破碎地面、墙体结构和红色光源，生成一张更清晰的场景参考图。",
    },
    {
      id: "default-brief",
      type: "text",
      title: "官方 brief 拆解",
      content: "拆解任务目标、不可出现内容、交付比例、镜头节奏和素材依赖。",
    },
  ];
}

function createMemoryTitle(content) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean || "对话记忆";
}

function createMemoryId() {
  return `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNode({
  id,
  type,
  title,
  content,
  x,
  y,
  fileName,
  imageDataUrl,
  imageUrls,
  referenceImageDataUrl,
  referenceImageUrls,
  referenceFileName,
  generatedImageUrl,
  generatedImageUrls,
  videoDataUrl,
  videoUrls,
  referenceVideoUrl,
  referenceVideoUrls,
  generatedVideoUrl,
  generatedVideoUrls,
  videoMode,
  videoDuration,
  videoModel,
  videoAspectRatio,
  videoResolution,
  videoSeed,
  videoGenerateAudio,
  videoReturnLastFrame,
  videoWebSearch,
  videoFirstFrameUrl,
  videoLastFrameUrl,
  videoReferenceAudioUrl,
  videoReferenceAudioUrls,
  imagePurpose,
  referenceMode,
  imageRole,
  imageQuality,
  imageModel,
  apimartChannel,
  folderNodes,
  folderConnections,
}) {
  const node = nodeTemplate.content.cloneNode(true).querySelector(".node");
  node.id = id || createNodeId();
  node.dataset.type = type;
  node.dataset.kind = "output";
  node.dataset.tone = `slot-${["a", "b", "c", "d"][nodeCounter % 4]}`;
  if (fileName) node.dataset.fileName = fileName;
  if (Array.isArray(imageUrls)) node.dataset.imageUrls = JSON.stringify(imageUrls);
  if (imageDataUrl) node.dataset.imageDataUrl = imageDataUrl;
  if (Array.isArray(referenceImageUrls)) node.dataset.referenceImageUrls = JSON.stringify(referenceImageUrls);
  if (referenceImageDataUrl) node.dataset.referenceImageDataUrl = referenceImageDataUrl;
  if (referenceFileName) node.dataset.referenceFileName = referenceFileName;
  if (generatedImageUrl) node.dataset.generatedImageUrl = generatedImageUrl;
  if (Array.isArray(generatedImageUrls)) node.dataset.generatedImageUrls = JSON.stringify(generatedImageUrls);
  if (Array.isArray(videoUrls)) node.dataset.videoUrls = JSON.stringify(videoUrls);
  if (videoDataUrl) node.dataset.videoDataUrl = videoDataUrl;
  if (Array.isArray(referenceVideoUrls)) node.dataset.referenceVideoUrls = JSON.stringify(referenceVideoUrls);
  if (referenceVideoUrl) node.dataset.referenceVideoUrl = referenceVideoUrl;
  if (generatedVideoUrl) node.dataset.generatedVideoUrl = generatedVideoUrl;
  if (Array.isArray(generatedVideoUrls)) node.dataset.generatedVideoUrls = JSON.stringify(generatedVideoUrls);
  if (videoMode) node.dataset.videoMode = videoMode;
  if (videoDuration) node.dataset.videoDuration = videoDuration;
  if (videoModel) node.dataset.videoModel = videoModel;
  if (videoAspectRatio) node.dataset.videoAspectRatio = videoAspectRatio;
  if (videoResolution) node.dataset.videoResolution = videoResolution;
  if (videoSeed) node.dataset.videoSeed = videoSeed;
  if (videoGenerateAudio !== undefined) node.dataset.videoGenerateAudio = String(videoGenerateAudio);
  if (videoReturnLastFrame !== undefined) node.dataset.videoReturnLastFrame = String(videoReturnLastFrame);
  if (videoWebSearch !== undefined) node.dataset.videoWebSearch = String(videoWebSearch);
  if (videoFirstFrameUrl) node.dataset.videoFirstFrameUrl = videoFirstFrameUrl;
  if (videoLastFrameUrl) node.dataset.videoLastFrameUrl = videoLastFrameUrl;
  if (videoReferenceAudioUrl) node.dataset.videoReferenceAudioUrl = videoReferenceAudioUrl;
  if (Array.isArray(videoReferenceAudioUrls)) node.dataset.videoReferenceAudioUrls = JSON.stringify(videoReferenceAudioUrls);
  if (imagePurpose) node.dataset.imagePurpose = imagePurpose;
  if (referenceMode) node.dataset.referenceMode = referenceMode;
  if (imageRole) node.dataset.imageRole = imageRole;
  if (imageQuality) node.dataset.imageQuality = imageQuality;
  if (imageModel) node.dataset.imageModel = imageModel;
  if (apimartChannel) node.dataset.apimartChannel = apimartChannel;
  if (Array.isArray(folderNodes)) node.dataset.folderNodes = JSON.stringify(folderNodes);
  if (Array.isArray(folderConnections)) node.dataset.folderConnections = JSON.stringify(folderConnections);
  node.querySelector(".node-title strong").textContent = title || `${typeNames[type]}节点`;
  node.querySelector(".node-description").textContent = content !== undefined ? content : nodeDefaults[type];
  node.querySelector(".node-type-select").value = type;
  canvasContent.appendChild(node);
  hydrateNode(node);
  moveNode(node, x ?? 120, y ?? 120);
  setNodeType(node, type, content);
  nodeCounter += 1;
  return node;
}

function startTitleEdit(titleEl) {
  const node = titleEl.closest(".node");
  selectNode(node);
  const original = titleEl.textContent;
  const input = document.createElement("input");
  input.className = "node-title-input";
  input.value = original;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const next = input.value.trim() || original;
    const strong = document.createElement("strong");
    strong.textContent = next;
    input.replaceWith(strong);
    saveCurrentProject();
  };

  input.addEventListener("blur", commit, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      input.value = original;
      input.blur();
    }
  });
}

function hydrateNode(node) {
  node.querySelector(".node-kind")?.remove();
  if (!node.querySelector(".node-port.in")) {
    const port = document.createElement("button");
    port.type = "button";
    port.className = "node-port in";
    port.title = "输入端口";
    node.appendChild(port);
  }
  if (!node.querySelector(".node-port.out")) {
    const port = document.createElement("button");
    port.type = "button";
    port.className = "node-port out";
    port.title = "输出端口";
    node.appendChild(port);
  }
}

function setNodeType(node, type, content) {
  node.dataset.type = type;
  node.classList.toggle("folder-node", type === "folder");
  if (type === "folder") {
    renderFolderNode(node);
    return;
  }
  node.querySelector(".node-type-label").textContent = typeLabels[type];
  configureNodeTypeSelect(node, type);
  ensureCustomButton(node, type);
  const description = node.querySelector(".node-description");
  if (content !== undefined) description.textContent = content;
  const value = description.textContent || nodeDefaults[type] || "";
  const body = node.querySelector(".node-body");

  if (type === "text") {
    const fields = parseTextNodeFields(value);
    body.innerHTML = `
      <div class="text-brief-grid">
        <label>需求<textarea class="text-brief-field" data-text-field="requirement" placeholder="保存核心需求">${escapeHtml(fields.requirement)}</textarea></label>
        <label>修改意见<textarea class="text-brief-field" data-text-field="revision" placeholder="保存要修改的地方">${escapeHtml(fields.revision)}</textarea></label>
        <label>场景描述<textarea class="text-brief-field" data-text-field="scene" placeholder="保存空间、镜头、氛围、材质等描述">${escapeHtml(fields.scene)}</textarea></label>
        <label>禁用项<textarea class="text-brief-field" data-text-field="negative" placeholder="保存不要出现的内容">${escapeHtml(fields.negative)}</textarea></label>
      </div>
    `;
    description.textContent = formatTextNodeFields(fields);
  } else if (type === "image") {
    if (description.textContent === "ApiMart / gpt-image-2-official 图片生成节点。") {
      description.textContent = "";
    }
    node.dataset.imagePurpose ||= imageOptions.purpose || "自定义";
    node.dataset.referenceMode ||= imageOptions.referenceMode || "structureStyle";
    node.dataset.imageRole ||= imageOptions.imageRole || "general";
    node.dataset.imageQuality ||= imageOptions.quality || "high";
    body.innerHTML = `
      <div class="image-node-shell">
        <label class="image-upload-window">
          <input class="node-file-input" type="file" accept="image/*" multiple>
          <span>上传</span>
          <small class="upload-name">${escapeHtml(node.dataset.fileName || "")}</small>
          <div class="upload-preview"></div>
        </label>
      </div>
    `;
  } else if (type === "video") {
    if (description.textContent === "Seedance 视频生成项目节点。") {
      description.textContent = "";
    }
    node.dataset.videoMode ||= "image-to-video";
    node.dataset.videoMode = normalizeVideoModeValue(node.dataset.videoMode);
    node.dataset.videoDuration ||= "5";
    node.dataset.videoModel = normalizeVideoModelValue(node.dataset.videoModel);
    body.innerHTML = `
      <div class="image-node-shell video-node-shell">
        <label class="image-upload-window video-upload-window">
          <input class="node-file-input" type="file" accept="video/*">
          <span>上传</span>
          <small class="upload-name">${escapeHtml(node.dataset.fileName || "")}</small>
          <div class="upload-preview video-preview"></div>
        </label>
      </div>
    `;
  } else {
    body.innerHTML = "";
  }
  renderNodeImagePreview(node);
}

function configureNodeTypeSelect(node, type) {
  const select = node.querySelector(".node-type-select");
  if (!select) return;
  if (type === "image") {
    select.dataset.roleSelect = "true";
    select.dataset.videoModeSelect = "false";
    select.dataset.nodeType = "image-role";
    select.hidden = true;
    ensureImageRolePicker(node);
    select.value = node.dataset.imageRole || "general";
    updateImageRoleSelectLabel(node);
    return;
  }

  if (type === "video") {
    select.dataset.roleSelect = "false";
    select.dataset.videoModeSelect = "true";
    select.dataset.nodeType = "video-mode";
    select.hidden = false;
    node.querySelector(".image-role-picker")?.remove();
    select.innerHTML = Object.entries(videoModeLabels)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
    select.value = normalizeVideoModeValue(node.dataset.videoMode);
    return;
  }

  select.dataset.roleSelect = "false";
  select.dataset.videoModeSelect = "false";
  select.dataset.nodeType = "node-type";
  select.hidden = false;
  node.querySelector(".image-role-picker")?.remove();
  select.innerHTML = `
    <option value="text">文本</option>
    <option value="image">图片</option>
    <option value="video">视频</option>
    <option value="folder">文件夹</option>
  `;
  select.value = type;
}

function normalizeVideoModeValue(value) {
  return videoModeLabels[value] ? value : "image-to-video";
}

function normalizeVideoModelValue(value) {
  const model = String(value || "").trim();
  if (model === "kling3" || model === "kling-motion-control") return "kling-motion-control";
  if (model === "happyhorse" || model === "happyhorse-1.0") return "happyhorse-1.0";
  return "doubao-seedance-2.0";
}

function setVideoMode(node, mode) {
  if (!node || !videoModeLabels[mode]) return;
  node.dataset.videoMode = mode;
  const select = node.querySelector(".node-type-select");
  if (select && select.dataset.videoModeSelect === "true") select.value = mode;
  saveCurrentProject();
}

function renderFolderNode(node) {
  const count = parseJsonArray(node.dataset.folderNodes).length;
  const title = node.querySelector(".node-title strong")?.textContent || "文件夹";
  node.innerHTML = `
    <div class="folder-canvas-entry">
      <span class="folder-large-icon" aria-hidden="true"></span>
      <div class="node-title folder-title"><strong title="点击重命名">${escapeHtml(title)}</strong></div>
      <small>${count} 个节点</small>
    </div>
  `;
}

function updateImageRoleSelectLabel(node) {
  const select = node.querySelector(".node-type-select");
  const button = node.querySelector(".image-role-button");
  const value = node.dataset.imageRole || "general";
  if (!roleLabels[value]) {
    node.dataset.imageRole = "general";
  }
  if (select && select.dataset.roleSelect === "true") select.value = node.dataset.imageRole || "general";
  if (button) button.textContent = roleLabels[node.dataset.imageRole || "general"];
}

function ensureImageRolePicker(node) {
  const head = node.querySelector(".node-head");
  if (!head || node.querySelector(".image-role-picker")) return;
  const picker = document.createElement("div");
  picker.className = "image-role-picker";
  picker.innerHTML = `
    <button class="image-role-button" type="button">${roleLabels[node.dataset.imageRole || "general"]}</button>
    <div class="image-role-menu">
      ${Object.entries(roleLabels)
        .map(([value, label]) => `<button class="image-role-option" type="button" data-role="${value}">${label}</button>`)
        .join("")}
    </div>
  `;
  const customButton = node.querySelector(".node-custom-button");
  head.insertBefore(picker, customButton || null);
}

function toggleImageRoleMenu(node) {
  if (!node) return;
  const picker = node.querySelector(".image-role-picker");
  if (!picker) return;
  const shouldOpen = !picker.classList.contains("open");
  closeImageRoleMenus();
  picker.classList.toggle("open", shouldOpen);
}

function closeImageRoleMenus() {
  document.querySelectorAll(".image-role-picker.open").forEach((picker) => picker.classList.remove("open"));
}

function setImageRole(node, role) {
  if (!node || !roleLabels[role]) return;
  node.dataset.imageRole = role;
    if (configNode === node) {
      imageOptions.imageRole = role;
      syncImageOptionsUi();
      saveImageOptions();
    }
  updateImageRoleSelectLabel(node);
  saveCurrentProject();
}

function renderNodeImagePreview(node) {
  if (node.dataset.type === "video") {
    renderNodeVideoPreview(node);
    return;
  }
  if (node.dataset.type !== "image") return;
  const preview = node.querySelector(".upload-preview");
  if (!preview) return;
  const uploaded = parseJsonArray(node.dataset.imageUrls);
  const generated = getGeneratedImageHistory(node);
  if (node.dataset.generatedImageUrl) {
    const historyCount = Math.max(0, generated.length - 1);
    preview.classList.add("output-preview");
    preview.innerHTML = `
      <img src="${node.dataset.generatedImageUrl}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'broken-image-placeholder', textContent:'图片链接失效'}))">
      ${historyCount ? `<button class="output-history-button" type="button">历史 ${historyCount}</button>` : ""}
      <div class="output-history-popover" aria-hidden="true">
        ${generated.slice(1).map((src) => `<img src="${src}" alt="">`).join("")}
      </div>
    `;
    refreshConnectionsAfterImages(preview);
    return;
  }
  preview.classList.remove("output-preview");
  const sources = [...uploaded, node.dataset.imageDataUrl].filter(Boolean);
  const uniqueSources = uniqueValues(sources);
  if (uniqueSources.length) {
    preview.innerHTML = uniqueSources.map((src) => `<img src="${src}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'broken-image-placeholder', textContent:'图片链接失效'}))">`).join("");
    refreshConnectionsAfterImages(preview);
  }
}

function renderNodeVideoPreview(node) {
  const preview = node.querySelector(".upload-preview");
  if (!preview) return;
  const uploaded = parseJsonArray(node.dataset.videoUrls);
  const generated = getGeneratedVideoHistory(node);
  if (node.dataset.generatedVideoUrl) {
    const historyCount = Math.max(0, generated.length - 1);
    preview.classList.add("output-preview");
    preview.innerHTML = `
      <video src="${node.dataset.generatedVideoUrl}" controls muted playsinline onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'broken-image-placeholder', textContent:'视频链接失效'}))"></video>
      ${historyCount ? `<button class="output-history-button" type="button">历史 ${historyCount}</button>` : ""}
      <div class="output-history-popover" aria-hidden="true">
        ${generated.slice(1).map((src) => `<video src="${src}" controls muted playsinline></video>`).join("")}
      </div>
    `;
    refreshConnectionsAfterImages(preview);
    return;
  }
  preview.classList.remove("output-preview");
  const sources = uniqueValues([...uploaded, node.dataset.videoDataUrl].filter(Boolean));
  if (sources.length) {
    preview.innerHTML = sources
      .map((src) => `<video src="${src}" controls muted playsinline onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'broken-image-placeholder', textContent:'视频链接失效'}))"></video>`)
      .join("");
    refreshConnectionsAfterImages(preview);
  }
}

function clearUploadedImages(node) {
  if (!node || node.dataset.type !== "image") return;
  delete node.dataset.imageUrls;
  delete node.dataset.imageDataUrl;
  delete node.dataset.fileName;
  const nameEl = node.querySelector(".upload-name");
  if (nameEl) nameEl.textContent = "";
  const fileInput = node.querySelector(".node-file-input");
  if (fileInput) fileInput.value = "";
  const preview = node.querySelector(".upload-preview");
  if (preview) {
    preview.classList.remove("output-preview");
    preview.innerHTML = "";
  }
  ensureNodeStatus(node).textContent = "已删除上传图片。";
  saveCurrentProject();
  refreshConnectionsSoon();
}

function addGeneratedImageHistory(node, imageUrl) {
  return uniqueValues([
    imageUrl,
    node.dataset.generatedImageUrl,
    ...parseJsonArray(node.dataset.generatedImageUrls),
  ].filter(Boolean)).slice(0, 12);
}

function getGeneratedImageHistory(node) {
  return uniqueValues([
    node.dataset.generatedImageUrl,
    ...parseJsonArray(node.dataset.generatedImageUrls),
  ].filter(Boolean));
}

function addGeneratedVideoHistory(node, videoUrl) {
  return uniqueValues([
    videoUrl,
    node.dataset.generatedVideoUrl,
    ...parseJsonArray(node.dataset.generatedVideoUrls),
  ].filter(Boolean)).slice(0, 12);
}

function getGeneratedVideoHistory(node) {
  return uniqueValues([
    node.dataset.generatedVideoUrl,
    ...parseJsonArray(node.dataset.generatedVideoUrls),
  ].filter(Boolean));
}

function toggleOutputHistory(node) {
  const popover = node?.querySelector(".output-history-popover");
  if (!popover) return;
  const wasOpen = popover.classList.contains("show");
  closeOutputHistoryPopovers();
  if (wasOpen) return;
  const isOpen = popover.classList.toggle("show");
  popover.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function closeOutputHistoryPopovers() {
  document.querySelectorAll(".output-history-popover.show").forEach((popover) => {
    popover.classList.remove("show");
    popover.setAttribute("aria-hidden", "true");
  });
}

function refreshConnectionsAfterImages(scope) {
  refreshConnectionsSoon();
  scope.querySelectorAll("img").forEach((image) => {
    if (image.complete) return;
    image.addEventListener("load", refreshConnectionsSoon, { once: true });
    image.addEventListener("error", refreshConnectionsSoon, { once: true });
  });
}

function refreshConnectionsSoon() {
  requestAnimationFrame(updateConnections);
  setTimeout(updateConnections, 60);
  setTimeout(updateConnections, 180);
}

function ensureCustomButton(node, type) {
  const head = node.querySelector(".node-head");
  let button = node.querySelector(".node-custom-button");
  if (type !== "image" && type !== "video") {
    button?.remove();
    return;
  }

  if (!button) {
    button = document.createElement("button");
    button.className = "node-custom-button";
    button.type = "button";
    head.appendChild(button);
  }
  button.textContent = type === "video" ? "设置" : "设置";
}

function openImageConfig(node) {
  configNode = node;
  const isVideo = node.dataset.type === "video";
  configNodeName.textContent = node.querySelector(".node-title strong")?.textContent || (isVideo ? "视频节点" : "图片节点");
  imagePromptInput.value = node.querySelector(".node-description")?.textContent || "";
  imagePromptInput.placeholder = isVideo
    ? "输入视频提示词：镜头运动、主体动作、节奏、时长、风格..."
    : "输入提示词描述...";
  if (imageModelSelect) {
    imageModelSelect.innerHTML = isVideo
      ? `
          <option value="doubao-seedance-2.0" selected>Seedance2</option>
          <option value="kling-motion-control">kling3</option>
          <option value="happyhorse-1.0">happyhorse</option>
        `
      : `
          <option value="gpt-image-2">GPT图像2</option>
          <option value="gpt-image-2-official" selected>gpt-image-2-官方</option>
          <option value="gemini-3-pro-image-preview">Nano Banana 2</option>
        `;
  }
  imageOptionsPopover?.classList.toggle("video-config-hidden", isVideo);
  openImageOptions?.classList.toggle("video-config-hidden", isVideo);
  removeVideoSettingsPanel();
  if (isVideo) {
    ensureVideoDefaults(node);
    if (imageModelSelect) imageModelSelect.value = normalizeVideoModelValue(node.dataset.videoModel);
    openImageOptions?.classList.remove("video-config-hidden");
    renderVideoSettingsPanel(node);
    syncVideoOptionsSummary(node);
    renderConfigInputThumbnails(node);
    syncImageSubmitButton(node);
    imageConfigPanel.classList.add("show");
    imageConfigPanel.setAttribute("aria-hidden", "false");
    return;
  }
  imageOptions = {
    purpose: node.dataset.imagePurpose || imageOptions.purpose || "自定义",
    referenceMode: node.dataset.referenceMode || imageOptions.referenceMode || "structureStyle",
    imageRole: node.dataset.imageRole || imageOptions.imageRole || "general",
    quality: node.dataset.imageQuality || imageOptions.quality || "high",
  };
  if (imageModelSelect) {
    imageModelSelect.value = node.dataset.imageModel || "gpt-image-2-official";
  }
  syncImageOptionsUi();
  renderConfigInputThumbnails(node);
  syncImageSubmitButton(node);
  imageConfigPanel.classList.add("show");
  imageConfigPanel.setAttribute("aria-hidden", "false");
}

function closeImageConfig() {
  syncImageSubmitButton(null);
  configNode = null;
  imageConfigPanel.classList.remove("show");
  imageConfigPanel.setAttribute("aria-hidden", "true");
  imageOptionsPopover.classList.remove("show");
  imageOptionsPopover.classList.remove("video-config-hidden");
  imageOptionsPopover.setAttribute("aria-hidden", "true");
  openImageOptions?.classList.remove("video-config-hidden");
  removeVideoSettingsPanel();
  referencePicker.classList.remove("show");
  referencePicker.setAttribute("aria-hidden", "true");
}

function syncImageOptionsSummary() {
  const modeLabel = {
    structureStyle: "结构+风格",
    strict: "严格重绘",
    style: "风格参考",
    creative: "创意扩展",
  }[imageOptions.referenceMode] || "严格重绘";
  const roleLabel = {
    general: "普通图片",
    editBase: "编辑底图",
    structure: "结构图",
    style: "风格图",
    output: "输出图",
  }[imageOptions.imageRole] || "普通图片";
  openImageOptions.textContent = `${imageOptions.purpose} / ${modeLabel} / ${roleLabel} / 尺寸提示词优先，默认结构图 / ${imageOptions.quality}`;
}

function syncImageOptionsUi() {
  Object.entries(imageOptions).forEach(([group, value]) => {
    const grid = imageOptionsPopover.querySelector(`[data-option-group="${group}"]`);
    grid?.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.value === value);
    });
  });
  if (configNode) {
    configNode.dataset.imageRole = imageOptions.imageRole || configNode.dataset.imageRole || "general";
    updateImageRoleSelectLabel(configNode);
  }
  syncImageOptionsSummary();
}

function ensureVideoDefaults(node) {
  if (!node) return;
  node.dataset.videoMode = normalizeVideoModeValue(node.dataset.videoMode);
  node.dataset.videoDuration ||= "5";
  node.dataset.videoModel = normalizeVideoModelValue(node.dataset.videoModel);
  node.dataset.videoAspectRatio ||= "16:9";
  node.dataset.videoResolution ||= "1080p";
  node.dataset.videoGenerateAudio ||= "false";
  node.dataset.videoReturnLastFrame ||= "false";
  node.dataset.videoWebSearch ||= "false";
}

function renderVideoSettingsPanel(node) {
  removeVideoSettingsPanel();
  ensureVideoDefaults(node);
  const panel = document.createElement("div");
  panel.className = "video-settings-panel";
  panel.innerHTML = `
    <div class="video-settings-grid">
      <label>
        <span>时长</span>
        <input data-video-setting="videoDuration" type="number" min="1" max="30" step="1" value="${escapeHtml(node.dataset.videoDuration || "5")}">
      </label>
      <label>
        <span>宽高比</span>
        <select data-video-setting="videoAspectRatio">
          ${videoAspectRatios.map((value) => `<option value="${value}">${value}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>分辨率</span>
        <select data-video-setting="videoResolution">
          ${videoResolutions.map((value) => `<option value="${value}">${value}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>随机种子</span>
        <input data-video-setting="videoSeed" type="number" min="0" step="1" placeholder="自动" value="${escapeHtml(node.dataset.videoSeed || "")}">
      </label>
    </div>
    <div class="video-toggle-row">
      <label><input data-video-setting="videoGenerateAudio" type="checkbox"> 生成音频</label>
      <label><input data-video-setting="videoReturnLastFrame" type="checkbox"> 返回尾帧</label>
      <label><input data-video-setting="videoWebSearch" type="checkbox"> 联网搜索</label>
    </div>
    <div class="video-upload-grid">
      ${renderVideoAssetPicker("firstFrame", "首帧图", "image/*", node.dataset.videoFirstFrameUrl)}
      ${renderVideoAssetPicker("lastFrame", "尾帧图", "image/*", node.dataset.videoLastFrameUrl)}
      ${renderVideoAssetPicker("referenceVideo", "参考视频", "video/*", node.dataset.referenceVideoUrl)}
      ${renderVideoAssetPicker("referenceAudio", "参考音频", "audio/*", node.dataset.videoReferenceAudioUrl)}
    </div>
  `;
  imageConfigPanel.insertBefore(panel, imagePromptInput.nextSibling);
  panel.querySelector('[data-video-setting="videoAspectRatio"]').value = node.dataset.videoAspectRatio || "16:9";
  panel.querySelector('[data-video-setting="videoResolution"]').value = node.dataset.videoResolution || "1080p";
  panel.querySelector('[data-video-setting="videoGenerateAudio"]').checked = node.dataset.videoGenerateAudio === "true";
  panel.querySelector('[data-video-setting="videoReturnLastFrame"]').checked = node.dataset.videoReturnLastFrame === "true";
  panel.querySelector('[data-video-setting="videoWebSearch"]').checked = node.dataset.videoWebSearch === "true";
}

function renderVideoAssetPicker(slot, label, accept, url = "") {
  return `
    <label class="video-asset-picker">
      <span>${label}</span>
      <input data-video-asset="${slot}" type="file" accept="${accept}">
      <small>${url ? "已上传" : "点击上传"}</small>
    </label>
  `;
}

function removeVideoSettingsPanel() {
  imageConfigPanel?.querySelector(".video-settings-panel")?.remove();
}

function persistVideoSettingsFromPanel(node) {
  if (!node) return;
  const panel = imageConfigPanel.querySelector(".video-settings-panel");
  if (!panel) return;
  panel.querySelectorAll("[data-video-setting]").forEach((input) => {
    const key = input.dataset.videoSetting;
    if (!key) return;
    if (input.type === "checkbox") {
      node.dataset[key] = String(input.checked);
    } else {
      node.dataset[key] = input.value.trim();
    }
  });
  ensureVideoDefaults(node);
  syncVideoOptionsSummary(node);
}

function syncVideoOptionsSummary(node) {
  if (!openImageOptions || !node) return;
  const modeLabel = videoModeLabels[normalizeVideoModeValue(node.dataset.videoMode)] || "图生视频";
  const flags = [
    node.dataset.videoGenerateAudio === "true" ? "音频" : "",
    node.dataset.videoReturnLastFrame === "true" ? "尾帧" : "",
    node.dataset.videoWebSearch === "true" ? "联网" : "",
  ].filter(Boolean);
  openImageOptions.textContent = [
    modeLabel,
    videoModelLabels[normalizeVideoModelValue(node.dataset.videoModel)] || node.dataset.videoModel || "Seedance2",
    `${node.dataset.videoDuration || "5"} 秒`,
    node.dataset.videoAspectRatio || "16:9",
    node.dataset.videoResolution || "1080p",
    flags.length ? flags.join("+") : "参数面板",
  ].join(" / ");
}

function persistImageConfigOptions() {
  if (!configNode) return;
  configNode.dataset.imagePurpose = imageOptions.purpose;
  configNode.dataset.referenceMode = imageOptions.referenceMode;
  configNode.dataset.imageRole = imageOptions.imageRole;
  delete configNode.dataset.imageRatio;
  delete configNode.dataset.imageResolution;
  configNode.dataset.imageQuality = imageOptions.quality;
  saveCurrentProject();
}

function saveImageOptions() {
  try {
    localStorage.setItem(IMAGE_OPTIONS_KEY, JSON.stringify(imageOptions));
  } catch (error) {
    console.error("Image options save failed", error);
  }
}

function loadImageOptions() {
  const saved = readJson(IMAGE_OPTIONS_KEY, null);
  if (!saved || typeof saved !== "object") return;
  imageOptions = {
    ...imageOptions,
    ...saved,
  };
}

function normalizeImageModel(value) {
  const model = String(value || "").trim();
  if (model === "gemini-3-pro-image-preview") return "gemini-3-pro-image-preview";
  if (model === "GPT Image 2" || model === "GPT图像2" || model === "gpt-image-2") return "gpt-image-2";
  return "gpt-image-2-official";
}

function renderReferencePicker() {
  const nodes = [...canvasContent.querySelectorAll(".node")].filter((node) => node !== configNode);
  if (!nodes.length) {
    referenceList.innerHTML = '<div class="reference-empty">当前画布暂无其他节点</div>';
    return;
  }

  referenceList.innerHTML = nodes
    .map((node) => {
      const title = node.querySelector(".node-title strong")?.textContent || "节点";
      const type = typeNames[node.dataset.type] || "绱犳潗";
      return `
        <button type="button" class="reference-item" data-reference-node="${escapeHtml(title)}">
          <div class="reference-thumb ${node.dataset.tone || "slot-a"}"></div>
          <span>${escapeHtml(title)}</span>
          <small>${type}</small>
        </button>
      `;
    })
    .join("");
}

function renderConfigInputThumbnails(node) {
  const old = imageConfigPanel.querySelector(".config-input-strip");
  old?.remove();

  const ownVideoAssets = node?.dataset.type === "video"
    ? [
        node.dataset.videoFirstFrameUrl ? { title: "首帧图", src: node.dataset.videoFirstFrameUrl, kind: "image" } : null,
        node.dataset.videoLastFrameUrl ? { title: "尾帧图", src: node.dataset.videoLastFrameUrl, kind: "image" } : null,
        node.dataset.referenceVideoUrl ? { title: "参考视频", src: node.dataset.referenceVideoUrl, kind: "video" } : null,
        node.dataset.videoReferenceAudioUrl ? { title: "参考音频", src: node.dataset.videoReferenceAudioUrl, kind: "audio" } : null,
      ].filter(Boolean)
    : [];

  const inputs = [
    ...ownVideoAssets,
    ...getConnectedInputNodes(node)
    .flatMap((sourceNode) => {
      const title = sourceNode.querySelector(".node-title strong")?.textContent || "输入节点";
      return [
        ...getNodeImageSources(sourceNode).slice(0, 1).map((src) => ({ title, src, kind: "image" })),
        ...getNodeVideoSources(sourceNode).slice(0, 1).map((src) => ({ title, src, kind: "video" })),
      ];
    })
    .filter((item) => item.src),
  ];

  if (!inputs.length) return;

  const strip = document.createElement("div");
  strip.className = "config-input-strip";
  strip.innerHTML = `
    <div class="config-input-strip-title">输入参考</div>
    <div class="config-input-thumbs">
      ${inputs
        .map(
          (item) => `
            <button class="config-input-thumb" type="button" title="${escapeHtml(item.title)}">
              ${
                item.kind === "video"
                  ? `<video src="${item.src}" muted playsinline></video>`
                  : item.kind === "audio"
                    ? `<div class="config-audio-thumb">Audio</div>`
                  : `<img src="${item.src}" alt="">`
              }
              <span>${escapeHtml(item.title)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
  imageConfigPanel.insertBefore(strip, imagePromptInput);
}

function getIncomingNodes(node) {
  return [...connectorSvg.querySelectorAll("path:not(.temp-wire)")]
    .filter((path) => path.dataset.to === node.id)
    .map((path) => document.getElementById(path.dataset.from))
    .filter(Boolean);
}

function getConnectedInputNodes(node) {
  const incoming = getIncomingNodes(node);
  const undirected = [...connectorSvg.querySelectorAll("path:not(.temp-wire)")]
    .filter((path) => path.dataset.from === node.id || path.dataset.to === node.id)
    .map((path) => document.getElementById(path.dataset.from === node.id ? path.dataset.to : path.dataset.from))
    .filter(Boolean);
  return uniqueValues([...incoming, ...undirected]).filter((item) => item !== node);
}

function getIncomingReferenceImages(node) {
  return getConnectedInputNodes(node).map(getNodeImageSource).filter(Boolean);
}

function buildPromptWithIncomingText(node, ownPrompt) {
  const textInputs = getConnectedInputNodes(node)
    .filter((sourceNode) => sourceNode.dataset.type === "text")
    .map(getNodeContent)
    .filter(Boolean);
  return [...textInputs, ownPrompt].filter(Boolean).join("\n\n");
}

function collectRoleReferenceImages(node) {
  const ownImages = getNodeImageSources(node);
  const incomingNodes = getConnectedInputNodes(node);
  const editBaseImages = [];
  const structureImages = [];
  const styleImages = [];
  const generalImages = [];

  if ((node.dataset.imageRole || "output") === "editBase" && ownImages.length) {
    editBaseImages.push(...ownImages);
  } else if ((node.dataset.imageRole || "output") !== "output" && ownImages.length) {
    structureImages.push(...ownImages);
  }

  incomingNodes.forEach((sourceNode) => {
    const images = getNodeImageSources(sourceNode).filter(isRemoteImageUrl);
    const role = sourceNode.dataset.imageRole || inferImageRole(sourceNode);
    if (role === "editBase") {
      editBaseImages.push(...images);
    } else if (role === "structure") {
      structureImages.push(...images);
    } else if (role === "style") {
      styleImages.push(...images);
    } else if (role === "output") {
      editBaseImages.push(...images);
    } else if (role !== "output") {
      generalImages.push(...images);
    }
  });

  return {
    editBase: uniqueValues(editBaseImages.filter(isRemoteImageUrl)),
    structure: uniqueValues(structureImages.filter(isRemoteImageUrl)),
    style: uniqueValues(styleImages.filter(isRemoteImageUrl)),
    general: uniqueValues(generalImages.filter(isRemoteImageUrl)),
  };
}

function inferImageRole(node) {
  const title = node?.querySelector(".node-title strong")?.textContent || "";
  if (/原图|渲染|结构|结构图/i.test(title)) return "structure";
  if (/参考|风格|样式|画风/i.test(title)) return "style";
  if (/编辑|底图|上一版|上一张|输出|生成|结果/i.test(title)) return "editBase";
  return "general";
}

function selectReferenceImagesForMode(mode, roleImages) {
  return buildReferencePlan(mode, roleImages).images;
}

function buildReferencePlan(mode, roleImages) {
  const editBase = roleImages.editBase?.[0] || "";
  const explicitStructure = roleImages.structure[0] || "";
  const fallbackStructure = roleImages.general[0] || "";
  const structure = editBase || explicitStructure || fallbackStructure || "";
  const remainingGeneral = structure ? roleImages.general.filter((url) => url !== structure) : roleImages.general;

  if (mode === "structureStyle") {
    const styles = (roleImages.style.length ? roleImages.style : remainingGeneral).slice(0, 1);
    const generalFallback = structure && styles.length ? [] : remainingGeneral.slice(0, 1);
    const images = structure
      ? [structure, structure, ...styles, ...generalFallback].filter(Boolean).slice(0, 4)
      : uniqueValues([...styles, ...generalFallback].filter(Boolean)).slice(0, 2);
    return {
      images,
      editBaseCount: editBase ? 1 : 0,
      structureCount: structure && !editBase ? 1 : 0,
      hasExplicitStructure: Boolean(editBase || explicitStructure || fallbackStructure),
      styleCount: styles.length,
      generalCount: generalFallback.length,
    };
  }
  if (mode === "strict") {
    const images = uniqueValues([structure, ...roleImages.structure, ...roleImages.general, ...roleImages.style].filter(Boolean)).slice(0, 1);
    return {
      images,
      editBaseCount: editBase && images.length ? 1 : 0,
      structureCount: !editBase && images.length ? 1 : 0,
      styleCount: 0,
      generalCount: 0,
    };
  }

  const styles = uniqueValues([...roleImages.style, ...roleImages.general, ...roleImages.structure]).slice(0, 4);
  return {
    images: styles,
    structureCount: 0,
    styleCount: styles.length,
    generalCount: 0,
  };
}

function formatReferencePlan(plan) {
  const parts = [];
  if (plan.editBaseCount) parts.push(`${plan.editBaseCount} 张编辑底图`);
  if (plan.structureCount) parts.push(`${plan.structureCount} 张结构图`);
  if (plan.styleCount) parts.push(`${plan.styleCount} 张风格图`);
  if (plan.generalCount) parts.push(`${plan.generalCount} 张普通参考图`);
  if (!plan.editBaseCount && !plan.structureCount && plan.styleCount) parts.push("无结构图");
  return parts.length ? `已附带 ${parts.join("、")}` : `已附带 ${plan.images.length} 张参考图`;
}

function getNodeImageSource(node) {
  return getNodeImageSources(node)[0] || "";
}

function getNodeImageSources(node) {
  if (!node) return [];
  return uniqueValues([
    node.dataset.generatedImageUrl,
    ...parseJsonArray(node.dataset.generatedImageUrls),
    ...parseJsonArray(node.dataset.imageUrls),
    node.dataset.imageDataUrl,
    ...parseJsonArray(node.dataset.referenceImageUrls),
    node.dataset.referenceImageDataUrl,
  ].filter(Boolean));
}

function getNodeVideoSource(node) {
  return getNodeVideoSources(node)[0] || "";
}

function getNodeVideoSources(node) {
  if (!node) return [];
  return uniqueValues([
    node.dataset.generatedVideoUrl,
    ...parseJsonArray(node.dataset.generatedVideoUrls),
    ...parseJsonArray(node.dataset.videoUrls),
    node.dataset.videoDataUrl,
    ...parseJsonArray(node.dataset.referenceVideoUrls),
    node.dataset.referenceVideoUrl,
  ].filter(Boolean));
}

function getNodeMediaSources(node) {
  return {
    images: getNodeImageSources(node),
    videos: getNodeVideoSources(node),
  };
}

function isRemoteImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseTextNodeFields(value = "") {
  const text = String(value || "");
  const fields = {
    requirement: "",
    revision: "",
    scene: "",
    negative: "",
  };
  const labels = [
    ["requirement", "需求"],
    ["revision", "修改意见"],
    ["scene", "场景描述"],
    ["negative", "禁用项"],
  ];

  labels.forEach(([key, label], index) => {
    const nextLabel = labels[index + 1]?.[1];
    const pattern = nextLabel
      ? new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n${nextLabel}[：:])`)
      : new RegExp(`${label}[：:]\\s*([\\s\\S]*)`);
    const match = text.match(pattern);
    if (match) fields[key] = match[1].trim();
  });

  if (!Object.values(fields).some(Boolean)) fields.requirement = text.trim();
  return fields;
}

function formatTextNodeFields(fields) {
  return [
    ["需求", fields.requirement],
    ["修改意见", fields.revision],
    ["场景描述", fields.scene],
    ["禁用项", fields.negative],
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}：${String(value).trim()}`)
    .join("\n");
}

function renderUploadControl(type, fileName = "") {
  const accept = type === "image" ? "image/*" : "video/*";
  const label = type === "image" ? "上传图片" : "上传视频";
  return `
    <label class="upload-control">
      <span>${label}</span>
      <input class="node-file-input" type="file" accept="${accept}">
      <div class="upload-box">
        <strong>${fileName ? "已选择文件" : label}</strong>
        <small class="upload-name">${escapeHtml(fileName || "点击选择本地文件")}</small>
      </div>
      <div class="upload-preview"></div>
    </label>
  `;
}

function duplicateNode(node) {
  const clone = createNode({
    type: node.dataset.type,
    title: `${node.querySelector(".node-title strong").textContent} 副本`,
    content: getNodeContent(node),
    imagePurpose: node.dataset.imagePurpose || "自定义",
    referenceMode: node.dataset.referenceMode || "structureStyle",
    imageRole: node.dataset.imageRole || "general",
    imageQuality: node.dataset.imageQuality || "low",
    imageModel: node.dataset.imageModel || "gpt-image-2-official",
    apimartChannel: "b",
    fileName: node.dataset.fileName || "",
    imageUrls: parseJsonArray(node.dataset.imageUrls),
    imageDataUrl: node.dataset.imageDataUrl || "",
    referenceImageUrls: parseJsonArray(node.dataset.referenceImageUrls),
    referenceImageDataUrl: node.dataset.referenceImageDataUrl || "",
    referenceFileName: node.dataset.referenceFileName || "",
    generatedImageUrl: node.dataset.generatedImageUrl || "",
    generatedImageUrls: parseJsonArray(node.dataset.generatedImageUrls),
    videoUrls: parseJsonArray(node.dataset.videoUrls),
    videoDataUrl: node.dataset.videoDataUrl || "",
    referenceVideoUrls: parseJsonArray(node.dataset.referenceVideoUrls),
    referenceVideoUrl: node.dataset.referenceVideoUrl || "",
    generatedVideoUrl: node.dataset.generatedVideoUrl || "",
    generatedVideoUrls: parseJsonArray(node.dataset.generatedVideoUrls),
    videoMode: normalizeVideoModeValue(node.dataset.videoMode),
    videoDuration: node.dataset.videoDuration || "5",
    videoModel: normalizeVideoModelValue(node.dataset.videoModel),
    videoAspectRatio: node.dataset.videoAspectRatio || "16:9",
    videoResolution: node.dataset.videoResolution || "1080p",
    videoSeed: node.dataset.videoSeed || "",
    videoGenerateAudio: node.dataset.videoGenerateAudio === "true",
    videoReturnLastFrame: node.dataset.videoReturnLastFrame === "true",
    videoWebSearch: node.dataset.videoWebSearch === "true",
    videoFirstFrameUrl: node.dataset.videoFirstFrameUrl || "",
    videoLastFrameUrl: node.dataset.videoLastFrameUrl || "",
    videoReferenceAudioUrl: node.dataset.videoReferenceAudioUrl || "",
    videoReferenceAudioUrls: parseJsonArray(node.dataset.videoReferenceAudioUrls),
    folderNodes: parseJsonArray(node.dataset.folderNodes),
    folderConnections: parseJsonArray(node.dataset.folderConnections),
    x: Number(node.dataset.x) + 36,
    y: Number(node.dataset.y) + 36,
  });
  selectNode(clone);
  saveCurrentProject();
}

function deleteNode(node) {
  connectorSvg
    .querySelectorAll(`[data-from="${node.id}"], [data-to="${node.id}"]`)
    .forEach((path) => path.remove());
  node.remove();
  selectNode(null);
  saveCurrentProject();
}

function deleteSelectedNodes() {
  const nodes = [...selectedNodes];
  if (!nodes.length) return;
  nodes.forEach((node) => {
    connectorSvg
      .querySelectorAll(`[data-from="${node.id}"], [data-to="${node.id}"]`)
      .forEach((path) => path.remove());
    node.remove();
  });
  selectNode(null);
  saveCurrentProject();
}

function ungroupFolderNode(folderNode) {
  if (!folderNode || folderNode.dataset.type !== "folder" || activeFolder) return;
  const folderNodes = parseJsonArray(folderNode.dataset.folderNodes);
  const folderConnections = parseJsonArray(folderNode.dataset.folderConnections);
  if (!folderNodes.length) {
    deleteNode(folderNode);
    return;
  }

  const originX = Number(folderNode.dataset.x) || 0;
  const originY = Number(folderNode.dataset.y) || 0;
  const restoredNodes = folderNodes.map((saved) => {
    const node = createNode({
      ...saved,
      x: originX + (Number(saved.x) || 0) - 120,
      y: originY + (Number(saved.y) || 0) - 120,
    });
    node.dataset.imagePurpose = saved.imagePurpose || "自定义";
    node.dataset.referenceMode = saved.referenceMode || "structureStyle";
    node.dataset.imageRole = saved.imageRole || "general";
    node.dataset.imageQuality = saved.imageQuality || "high";
    node.dataset.imageModel = normalizeImageModel(saved.imageModel || "gpt-image-2-official");
    node.dataset.apimartChannel = "b";
    if (saved.tone) node.dataset.tone = saved.tone;
    if (Array.isArray(saved.folderNodes)) node.dataset.folderNodes = JSON.stringify(saved.folderNodes);
    if (Array.isArray(saved.folderConnections)) node.dataset.folderConnections = JSON.stringify(saved.folderConnections);
    setNodeType(node, saved.type, saved.content);
    renderNodeImagePreview(node);
    if (saved.imageDataKey) {
      loadProjectImage(saved.imageDataKey).then((value) => {
        if (!value) return;
        node.dataset.imageDataUrl = value;
        renderNodeImagePreview(node);
      });
    }
    if (saved.referenceImageDataKey) {
      loadProjectImage(saved.referenceImageDataKey).then((value) => {
        if (value) node.dataset.referenceImageDataUrl = value;
      });
    }
    return node;
  });

  folderNode.remove();
  folderConnections.forEach((saved) => {
    const from = document.getElementById(saved.from);
    const to = document.getElementById(saved.to);
    if (from && to) addConnection(from, to, saved.fromSide || "right", saved.toSide || "left");
  });
  selectNodes(restoredNodes);
  saveCurrentProject();
  refreshConnectionsSoon();
}

function createFolderFromSelectedNodes() {
  const nodes = [...selectedNodes].filter((node) => node.isConnected);
  if (!nodes.length || activeFolder) return;
  const ids = new Set(nodes.map((node) => node.id));
  const minX = Math.min(...nodes.map((node) => Number(node.dataset.x) || 0));
  const minY = Math.min(...nodes.map((node) => Number(node.dataset.y) || 0));
  const folderNodes = serializeNodes(nodes).map((node) => ({
    ...node,
    x: (Number(node.x) || 0) - minX + 120,
    y: (Number(node.y) || 0) - minY + 120,
  }));
  const folderConnections = serializeConnections((path) => ids.has(path.dataset.from) && ids.has(path.dataset.to));

  connectorSvg.querySelectorAll("path:not(.temp-wire)").forEach((path) => {
    if (ids.has(path.dataset.from) || ids.has(path.dataset.to)) path.remove();
  });
  nodes.forEach((node) => node.remove());
  clearSelectedNodes();

  const folder = createNode({
    type: "folder",
    title: `文件夹 ${folderNodes.length}`,
    content: `文件夹内包含 ${folderNodes.length} 个节点。`,
    x: minX,
    y: minY,
    folderNodes,
    folderConnections,
  });
  selectNode(folder);
  saveCurrentProject();
  refreshConnectionsSoon();
}

function enterFolder(folderNode) {
  if (!folderNode || folderNode.dataset.type !== "folder" || activeFolder) return;
  saveCurrentProject();
  activeFolder = {
    id: folderNode.id,
    title: folderNode.querySelector(".node-title strong")?.textContent || "文件夹",
  };
  const data = {
    nodes: parseJsonArray(folderNode.dataset.folderNodes),
    connections: parseJsonArray(folderNode.dataset.folderConnections),
  };
  clearCanvas();
  restoreCanvasData(data);
  syncFolderUi();
}

function exitFolder() {
  if (!activeFolder) return;
  saveActiveFolder();
  activeFolder = null;
  clearCanvas();
  restoreProject(currentProject);
  syncFolderUi();
}

function saveActiveFolder() {
  if (!activeFolder || !currentProject) return;
  const root = readJson(projectKey(currentProject), { nodes: [], connections: [], memories: conversationMemories });
  const folder = root.nodes?.find((node) => node.id === activeFolder.id);
  if (!folder) return;
  const data = serializeCanvasData();
  folder.folderNodes = data.nodes;
  folder.folderConnections = data.connections;
  folder.content = `文件夹内包含 ${data.nodes.length} 个节点。`;
  try {
    localStorage.setItem(projectKey(currentProject), JSON.stringify(root));
  } catch (error) {
    console.error("Folder save failed", error);
  }
}

function syncFolderUi() {
  if (exitFolderCanvas) exitFolderCanvas.hidden = !activeFolder;
  if (folderExitTop) folderExitTop.hidden = !activeFolder;
  if (createFolderFromSelection) createFolderFromSelection.hidden = Boolean(activeFolder);
  if (workspaceProjectName) {
    workspaceProjectName.textContent = activeFolder ? `${currentProject} / ${activeFolder.title}` : currentProject;
  }
}

function getActionNodes(fallbackNode) {
  if (fallbackNode && selectedNodes.size > 1 && selectedNodes.has(fallbackNode)) {
    return [...selectedNodes];
  }
  return fallbackNode ? [fallbackNode] : [];
}

function runNode(node) {
  if (node.dataset.type === "image") {
    runImageGeneration(node);
    return;
  }
  if (node.dataset.type === "video") {
    runVideoGeneration(node);
    return;
  }

  node.classList.add("running");
  let status = node.querySelector(".node-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "node-status";
    node.appendChild(status);
  }
  status.textContent =
    node.dataset.type === "image"
      ? `正在提交 ApiMart ${normalizeImageModel(node.dataset.imageModel || "gpt-image-2-official")}...`
      : node.dataset.type === "video"
        ? `正在提交 ApiMart ${videoModelLabels[normalizeVideoModelValue(node.dataset.videoModel)] || "Seedance2"} 视频项目...`
        : "正在处理文本对话...";
  setTimeout(() => {
    node.classList.remove("running");
    status.textContent = "任务已保存到当前画布。";
  }, 800);
}

async function runVideoGeneration(node) {
  const status = ensureNodeStatus(node);
  const preview = node.querySelector(".upload-preview");
  ensureVideoDefaults(node);
  const prompt = buildPromptWithIncomingText(node, node.querySelector(".node-description")?.textContent || "");
  const connectedNodes = getConnectedInputNodes(node);
  const imageUrls = uniqueValues([
    ...getNodeImageSources(node),
    ...connectedNodes.flatMap(getNodeImageSources),
  ].filter(isRemoteImageUrl));
  const videoUrls = uniqueValues([
    ...getNodeVideoSources(node),
    ...connectedNodes.flatMap(getNodeVideoSources),
  ].filter(isRemoteImageUrl));

  node.classList.add("running");
  status.textContent = "正在提交 ApiMart 视频任务...";
  if (preview && !preview.innerHTML.trim()) {
    preview.innerHTML = '<div class="generated-placeholder">生成中</div>';
  }

  try {
    const payload = {
      model: normalizeVideoModelValue(node.dataset.videoModel),
      mode: normalizeVideoModeValue(node.dataset.videoMode),
      prompt,
      imageUrls,
      videoUrls,
      duration: node.dataset.videoDuration || "5",
      aspectRatio: node.dataset.videoAspectRatio || "16:9",
      resolution: node.dataset.videoResolution || "1080p",
      seed: node.dataset.videoSeed || "",
      generateAudio: node.dataset.videoGenerateAudio === "true",
      returnLastFrame: node.dataset.videoReturnLastFrame === "true",
      webSearch: node.dataset.videoWebSearch === "true",
      firstFrameUrl: node.dataset.videoFirstFrameUrl || "",
      lastFrameUrl: node.dataset.videoLastFrameUrl || "",
      referenceAudioUrls: uniqueValues([
        node.dataset.videoReferenceAudioUrl,
        ...parseJsonArray(node.dataset.videoReferenceAudioUrls),
      ].filter(isRemoteImageUrl)),
      apimartChannel: "b",
    };
    node.dataset.lastVideoPayload = JSON.stringify(payload);
    const result = await submitAndPollVideoTask(payload, status);
    if (!result.videoUrl) throw new Error("任务完成但没有返回视频地址");
    node.dataset.generatedVideoUrl = result.videoUrl;
    node.dataset.generatedVideoUrls = JSON.stringify(addGeneratedVideoHistory(node, result.videoUrl));
    renderNodeVideoPreview(node);
    status.textContent = "视频生成完成。";
  } catch (error) {
    status.textContent = `视频生成失败：${error instanceof Error ? error.message : String(error)}`;
  } finally {
    node.classList.remove("running");
    saveCurrentProject();
  }
}

async function submitAndPollVideoTask(payload, status) {
  const response = await fetch("/api/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await readResponseJson(response);
  if (!response.ok) throw new Error(formatApiError(result, `HTTP ${response.status}`));
  if (!result.taskId) throw new Error("后端没有返回 video taskId");
  status.textContent = "视频任务已提交，正在生成...";
  return pollVideoTask(result.taskId, status, payload.apimartChannel);
}

async function pollVideoTask(taskId, statusEl, apimartChannel = "b") {
  const deadline = Date.now() + 1800000;
  let lastStatus = "submitted";
  let attempts = 0;
  while (Date.now() < deadline) {
    await sleep(5000);
    attempts += 1;
    const response = await fetch(
      `/api/generate-video?taskId=${encodeURIComponent(taskId)}&apimartChannel=${encodeURIComponent(apimartChannel)}`,
    );
    const result = await readResponseJson(response);
    if (!response.ok) throw new Error(formatApiError(result, `HTTP ${response.status}`));
    lastStatus = result.status || lastStatus;
    const minutes = Math.floor((attempts * 5) / 60);
    if (statusEl) statusEl.textContent = `视频生成中：${lastStatus}，已等待约 ${minutes} 分钟`;
    if (result.videoUrl) return result;
    if (["failed", "error", "cancelled"].includes(lastStatus)) {
      throw new Error(formatApiError(result, `ApiMart 视频任务失败：${lastStatus}`));
    }
  }
  throw new Error(`等待视频生成超过 30 分钟，最后状态：${lastStatus}`);
}

async function runImageGeneration(node) {
  if (imageGenerationControllers.has(node.id)) {
    cancelImageGeneration(node);
    return;
  }

  const controller = new AbortController();
  imageGenerationControllers.set(node.id, controller);
  syncImageSubmitButton(node);

  const prompt = buildPromptWithIncomingText(node, node.querySelector(".node-description")?.textContent || "");
  const preview = node.querySelector(".upload-preview");
  const uploadName = node.dataset.fileName || "";
  const status = ensureNodeStatus(node);
  const referenceMode = node.dataset.referenceMode || "structureStyle";
  const selectedModel = normalizeImageModel(node.dataset.imageModel || imageModelSelect?.value || "gpt-image-2-official");
  const roleImages = collectRoleReferenceImages(node);
  const referencePlan = buildReferencePlan(referenceMode, roleImages);
  const referenceImages = referencePlan.images;
  const requestedSize = await resolveGenerationSize(prompt, referencePlan);
  const enhancedPrompt = sanitizeGenerationPrompt(buildImageEditPrompt(
    prompt,
    referenceMode,
    roleImages,
    referencePlan,
    node.dataset.imagePurpose || imageOptions.purpose,
  ));

  node.classList.add("running");
  status.textContent = `正在准备 ApiMart ${selectedModel} 图片任务...`;

    const payload = {
      model: selectedModel,
      prompt: enhancedPrompt,
      imageName: uploadName,
      imageDataUrls: referenceImages,
      purpose: node.dataset.imagePurpose || imageOptions.purpose,
      referenceMode: node.dataset.referenceMode || imageOptions.referenceMode,
      quality: node.dataset.imageQuality || imageOptions.quality,
      size: requestedSize,
      apimartChannel: "b",
  };

  try {
    const hasLocalOnlyReferences = [
      ...parseJsonArray(node.dataset.imageUrls),
      node.dataset.imageDataUrl,
      ...parseJsonArray(node.dataset.referenceImageUrls),
      node.dataset.referenceImageDataUrl,
      ...getConnectedInputNodes(node).flatMap(getNodeImageSources),
    ].some((value) => value && !isRemoteImageUrl(value));

    status.textContent = referenceImages.length
      ? `正在提交后端 /api/generate-image，${formatReferencePlan(referencePlan)}，尺寸 ${requestedSize || "自动"}...`
      : hasLocalOnlyReferences
        ? "正在提交后端 /api/generate-image，旧本地图片需重新上传后才能作为参考图..."
      : `正在提交后端 /api/generate-image，未检测到参考图，尺寸 ${requestedSize || "自动"}...`;
    node.dataset.lastImagePayload = JSON.stringify(payload);

    const finalResult = await submitAndPollImageTask(payload, status, preview, node, controller.signal);
    if (!finalResult.imageUrl) {
      throw new Error("任务完成但没有返回图片地址");
    }

    if (preview) {
      preview.innerHTML = `<img src="${finalResult.imageUrl}" alt="">`;
    }
    node.dataset.generatedImageUrl = finalResult.imageUrl;
    node.dataset.generatedImageUrls = JSON.stringify(addGeneratedImageHistory(node, finalResult.imageUrl));
    renderNodeImagePreview(node);
    status.textContent = "图片生成完成。";
  } catch (error) {
    if (isAbortError(error)) {
      status.textContent = "生成已取消，可以修改后重新提交。";
    } else {
      status.textContent = `生成失败：${error instanceof Error ? error.message : "请确认已部署后端并配置 APIMART_API_KEY。"}`;
    }
    if (preview && !preview.innerHTML.trim()) {
      preview.innerHTML = '<div class="generated-placeholder">后端未连接</div>';
    }
  } finally {
    imageGenerationControllers.delete(node.id);
    syncImageSubmitButton(node);
    node.classList.remove("running");
    saveCurrentProject();
  }
}

async function pollImageTask(taskId, statusEl, signal, apimartChannel = "b") {
  const deadline = Date.now() + 1800000;
  let lastStatus = "submitted";
  let attempts = 0;

  while (Date.now() < deadline) {
    await sleep(5000, signal);
    attempts += 1;
    const response = await fetch(
      `/api/generate-image?taskId=${encodeURIComponent(taskId)}&apimartChannel=${encodeURIComponent(apimartChannel)}`,
      { signal },
    );
    const result = await readResponseJson(response);
    if (!response.ok) {
      throw new Error(formatApiError(result, `HTTP ${response.status}`));
    }
    lastStatus = result.status || lastStatus;
    if (statusEl) {
      const minutes = Math.floor((attempts * 5) / 60);
      statusEl.textContent = `生成中：${lastStatus}，已等待约 ${minutes} 分钟`;
    }
    if (result.imageUrl) {
      return result;
    }
    if (["failed", "error", "cancelled"].includes(lastStatus)) {
      throw new Error(formatApiError(result, `ApiMart 任务失败：${lastStatus}`));
    }
  }

  throw new Error(`等待图片生成超过 30 分钟，最后状态：${lastStatus}`);
}

async function submitAndPollImageTask(payload, status, preview, node, signal) {
  try {
    return await submitAndPollImageTaskOnce(payload, status, preview, node, signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/prohibited|flagged|safety|policy|moderation|敏感|违规|拦截/i.test(message)) throw error;
    status.textContent = "提示词或参考图触发上游拦截，正在移除参考图并安全重试一次...";
    const saferPayload = {
      ...payload,
      prompt: makePromptSafer(payload.prompt),
      imageDataUrls: [],
      imageName: "",
    };
    node.dataset.lastImagePayload = JSON.stringify(saferPayload);
    return submitAndPollImageTaskOnce(saferPayload, status, preview, node, signal);
  }
}

async function submitAndPollImageTaskOnce(payload, status, preview, node, signal) {
  let response = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  let result = await readResponseJson(response);
  if (!response.ok && shouldRetryWithSaferPrompt(result)) {
    status.textContent = "提示词触发上游拦截，正在安全改写后重试提交...";
    payload.prompt = makePromptSafer(payload.prompt);
    node.dataset.lastImagePayload = JSON.stringify(payload);
    response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    result = await readResponseJson(response);
  }
  if (!response.ok) {
    throw new Error(formatApiError(result, `HTTP ${response.status}`));
  }
  if (!result.taskId) {
    throw new Error("后端没有返回 taskId");
  }

  node.dataset.lastImageTaskId = result.taskId;
  status.textContent = "任务已提交，正在生成...";
  if (preview) {
    preview.innerHTML = '<div class="generated-placeholder">生成中</div>';
  }
  return pollImageTask(result.taskId, status, signal, payload.apimartChannel);
}

function cancelImageGeneration(node) {
  const controller = imageGenerationControllers.get(node.id);
  if (!controller) return;
  controller.abort();
  const status = ensureNodeStatus(node);
  status.textContent = "正在取消生成...";
  syncImageSubmitButton(node);
}

function syncImageSubmitButton(node) {
  if (!submitImageConfig) return;
  const activeNode = node || configNode;
  const isRunning = activeNode ? imageGenerationControllers.has(activeNode.id) : false;
  submitImageConfig.textContent = isRunning ? "停止生成" : "提交";
  submitImageConfig.classList.toggle("danger", isRunning);
}

function isAbortError(error) {
  return error?.name === "AbortError" || /abort/i.test(String(error?.message || error));
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function openImageViewer(src, sources = [src]) {
  if (!imageViewer || !imageViewerImg || !src) return;
  imageViewerSources = uniqueValues((sources.length ? sources : [src]).filter(Boolean));
  imageViewerIndex = Math.max(0, imageViewerSources.indexOf(src));
  imageViewerImg.src = src;
  setImageViewerScale(1);
  imageViewer.classList.add("show");
  imageViewer.setAttribute("aria-hidden", "false");
}

function closeImageViewerPanel() {
  if (!imageViewer || !imageViewerImg) return;
  imageViewer.classList.remove("show");
  imageViewer.setAttribute("aria-hidden", "true");
  imageViewerImg.removeAttribute("src");
  imageViewerSources = [];
  imageViewerIndex = 0;
  setImageViewerScale(1);
}

function setImageViewerScale(scale) {
  imageViewerScale = Math.min(4, Math.max(0.5, scale));
  if (imageViewerImg) {
    imageViewerImg.style.transform = `scale(${imageViewerScale})`;
    imageViewerImg.style.cursor = imageViewerScale > 1 ? "zoom-out" : "zoom-in";
  }
}

function stepImageViewer(direction) {
  if (!imageViewerSources.length || !imageViewerImg) return;
  imageViewerIndex = (imageViewerIndex + direction + imageViewerSources.length) % imageViewerSources.length;
  imageViewerImg.src = imageViewerSources[imageViewerIndex];
  setImageViewerScale(1);
}

function getViewerSourcesForImage(image) {
  const node = image.closest(".node");
  if (node?.dataset.type === "image") {
    return uniqueValues([
      ...getGeneratedImageHistory(node),
      ...parseJsonArray(node.dataset.imageUrls),
      node.dataset.imageDataUrl,
    ].filter(Boolean));
  }
  const scope = image.closest(".upload-preview, .config-input-thumbs, .output-history-popover") || document;
  return uniqueValues([...scope.querySelectorAll("img")].map((item) => item.src).filter(Boolean));
}

async function resolveGenerationSize(prompt, referencePlan) {
  const explicit = parseExplicitSize(prompt);
  if (explicit) return explicit;
  const structureImage = referencePlan?.images?.[0] || "";
  const dimensions = await getImageDimensions(structureImage);
  if (dimensions) return sizeFromDimensions(dimensions.width, dimensions.height);
  return "";
}

function parseExplicitSize(prompt) {
  const text = String(prompt || "");
  const sizeMatch = text.match(/(\d{3,5})\s*(?:x|\*|×|X)\s*(\d{3,5})/);
  if (sizeMatch) return normalizeGenerationSize(Number(sizeMatch[1]), Number(sizeMatch[2]));
  const ratioMatch = text.match(/(?:比例|画幅|aspect\s*ratio)?\s*(\d{1,2})\s*[:：]\s*(\d{1,2})/i);
  if (!ratioMatch) return "";
  const width = Number(ratioMatch[1]);
  const height = Number(ratioMatch[2]);
  if (!width || !height) return "";
  if (width === height) return "2048x2048";
  if (width > height) return "2560x1440";
  return "1440x2560";
}

function getImageDimensions(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function sizeFromDimensions(width, height) {
  return normalizeGenerationSize(width, height);
}

function normalizeGenerationSize(width, height) {
  if (!width || !height) return "";
  const maxEdge = Math.max(width, height);
  const scale = maxEdge > 3840 ? 3840 / maxEdge : 1;
  const nextWidth = Math.min(3840, Math.max(16, Math.round((width * scale) / 16) * 16));
  const nextHeight = Math.min(3840, Math.max(16, Math.round((height * scale) / 16) * 16));
  return `${nextWidth}x${nextHeight}`;
}

async function readResponseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
      message: text.slice(0, 240),
    };
  }
}

function formatApiError(result, fallback) {
  if (!result) return fallback;
  if (typeof result === "string") return result;
  const message = extractApiErrorMessage(result);
  if (message) return message;
  try {
    return JSON.stringify(result);
  } catch {
    return fallback;
  }
}

function extractApiErrorMessage(value, seen = new Set()) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/internal server error|server_error/i.test(value)) return "上游图片生成服务内部错误，请稍后重试，或切换 ApiMart 通道后再试。";
    return value;
  }
  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  const direct = value.message || value.error || value.detail || value.code;
  const directMessage = extractApiErrorMessage(direct, seen);
  if (directMessage) return directMessage;
  for (const item of Object.values(value)) {
    const nested = extractApiErrorMessage(item, seen);
    if (nested) return nested;
  }
  return "";
}

function shouldRetryWithSaferPrompt(result) {
  const message = formatApiError(result, "");
  return /prohibited|flagged|safety|policy|moderation|敏感|违规|拦截/i.test(message);
}

function sanitizeGenerationPrompt(prompt) {
  return makePromptSafer(prompt);
}

function makePromptSafer(prompt) {
  return String(prompt || "")
    .replace(/characters or creatures/gi, "extra subjects")
    .replace(/characters/gi, "extra subjects")
    .replace(/creatures/gi, "extra subjects")
    .replace(/broken/gi, "damaged")
    .replace(/破碎/g, "受损")
    .replace(/不要有太繁复/g, "保持简洁")
    .replace(/不要/g, "避免")
    .replace(/禁止/g, "避免");
}

async function fileToDataUrl(file) {
  if (file.type.startsWith("image/")) {
    if (file.size <= 1.8 * 1024 * 1024) {
      return readFileAsDataUrl(file);
    }
    return compressImageFile(file, 3.2 * 1024 * 1024);
  }

  return readFileAsDataUrl(file);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file) {
  return uploadMediaFile(file);
}

async function uploadMediaFile(file) {
  const imageDataUrl = await fileToDataUrl(file);
  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      imageDataUrl,
    }),
  });
  const result = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(formatApiError(result, `HTTP ${response.status}`));
  }
  if (!result.url) {
    throw new Error("上传接口没有返回图片 URL");
  }
  return result.url;
}

function compressImageFile(file, targetBytes = 3.2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const sourceMaxSide = Math.max(image.naturalWidth, image.naturalHeight);
      const candidates = [
        { maxSide: 3072, quality: 0.94 },
        { maxSide: 2560, quality: 0.92 },
        { maxSide: 2208, quality: 0.9 },
        { maxSide: 1920, quality: 0.88 },
        { maxSide: 1600, quality: 0.86 },
        { maxSide: 1280, quality: 0.84 },
      ];

      let best = "";
      for (const candidate of candidates) {
        const scale = Math.min(1, candidate.maxSide / sourceMaxSide);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const output = canvas.toDataURL("image/jpeg", candidate.quality);
        best = output;
        if (estimateDataUrlBytes(output) <= targetBytes) {
          resolve(output);
          return;
        }
      }

      resolve(best);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片压缩失败"));
    };

    image.src = objectUrl;
  });
}

function estimateDataUrlBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Math.ceil((base64.length * 3) / 4);
}

function buildImageEditPrompt(
  prompt,
  mode = "structureStyle",
  roleImages = { structure: [], style: [], general: [] },
  referencePlan = { images: [], structureCount: 0, styleCount: 0, generalCount: 0 },
  purpose = "自定义",
) {
  const referenceCount = Array.isArray(referencePlan.images) ? referencePlan.images.length : Number(referencePlan) || 0;
  const styleCount = Number(referencePlan.styleCount || 0);
  const hasEditBase = Number(referencePlan.editBaseCount || 0) > 0;
  const hasStructureReference = Number(referencePlan.structureCount || 0) > 0;
  const userPrompt = String(prompt || "").trim() || "生成一张高质量游戏宣发视觉图。";
  const purposeText = purpose && purpose !== "自定义" ? `Image purpose: ${purpose}` : "Image purpose: game visual production";
  const referenceSizeRule = hasEditBase
    ? "Output size policy: If the user request explicitly states aspect ratio, canvas size, image size, or resolution, follow the user request. Otherwise match the edit base image's aspect ratio, framing, and output canvas proportions."
    : hasStructureReference
      ? "Output size policy: If the user request explicitly states aspect ratio, canvas size, image size, or resolution, follow the user request. Otherwise match the structure reference image's aspect ratio, framing, and output canvas proportions."
      : "Output size policy: Follow any explicit aspect ratio, canvas size, image size, or resolution in the user request. If none is provided and no structure reference is attached, choose a natural production canvas for the requested scene without inventing arbitrary numeric dimensions.";
  const baseRules = [
    purposeText,
    "Production target: high-quality game environment concept art with readable spatial design, stable perspective, clear foreground/midground/background depth, polished lighting, strong atmosphere, and production-ready material detail.",
    "Follow the user's intent exactly. Improve wording clarity only; do not invent a different setting, architecture type, story, logo, text, or unrelated props.",
    "Avoid low resolution, blur, muddy textures, warped architecture, unstable perspective, duplicated objects, random text, watermark, logo, frame, UI overlay, and poster typography unless explicitly requested.",
    "Keep an environment-focused composition and avoid unrelated added subjects unless the user explicitly requests them.",
    referenceSizeRule,
    "User request:",
    userPrompt,
  ];

  if (!referenceCount) {
    return [
      ...baseRules,
      "No reference image is attached. Build the scene from the user request with stable camera, coherent perspective, readable environment layout, clear lighting direction, and finished game environment art quality.",
    ].join("\n");
  }

  if (hasEditBase) {
    return [
      ...baseRules,
      "Multimodal edit mode:",
      "- The first input image is the EDIT BASE image. It is the dominant source. Edit this exact scene image instead of creating a new unrelated image.",
      "- Preserve the base image's camera position, perspective, horizon line, vanishing points, scene layout, architecture positions, terrain or room shape, scale, depth layers, and lighting direction unless the user explicitly asks to change them.",
      `- The next ${Math.max(0, styleCount)} input image(s) are STYLE references. Use them only for environment art style, color grading, lighting quality, weather, atmosphere, material finish, surface texture, brush or render language, and final polish.`,
      "Apply only the requested changes from the user request. Keep unchanged areas visually consistent with the base image.",
      "If a style reference conflicts with the edit base image's layout, camera, geometry, or object placement, ignore the conflicting part of the style reference.",
      "Avoid unrelated added subjects, text, UI, watermark, new architecture, or unrelated props unless explicitly requested.",
      "Do not crop, rotate, zoom, reframe, or redesign the scene.",
    ].join("\n");
  }

  if (mode === "structureStyle") {
    if (!hasStructureReference) {
      return [
        ...baseRules,
        "Image reference roles:",
        `- The ${Math.max(0, styleCount)} input image(s) are STYLE references only. Use them for environment art style, color grading, lighting quality, weather, atmosphere, material finish, surface texture, brush or render language, and final polish.`,
        "No structure reference image is attached. Build the scene layout from the user's request instead of copying composition from any style reference.",
        "Do not treat any style reference as the scene structure. Do not copy its camera angle, architecture layout, props, or composition unless explicitly requested.",
      ].join("\n");
    }
    return [
      ...baseRules,
      "Image reference roles:",
      "- The first input image is the SCENE STRUCTURE reference. It is the dominant source. If any other reference conflicts with it, ignore the other reference.",
      "- Preserve the structure reference's camera position, lens feeling, horizon line, vanishing points, perspective, terrain or room shape, building silhouettes, architectural layout, object scale, foreground/midground/background relationship, and lighting direction.",
      `- The next ${Math.max(0, styleCount)} input image(s) are STYLE references only. Use them only for material finish, color grading, lighting quality, weather, atmosphere, surface texture, brush or render language, and final polish.`,
      "Do not copy the style reference composition, camera angle, architecture layout, scene geometry, props, silhouettes, object placement, or focal subject.",
      "The final image must be a redraw of the structure reference's scene layout, not a redraw of the style reference.",
      "Keep perspective, horizon, vanishing points, architecture positions, terrain shape, wall/floor/ceiling relationships, scale, and lighting direction stable. Do not crop, rotate, zoom, reframe, replace, or redesign the scene layout.",
    ].join("\n");
  }

  if (mode === "style") {
    return [
      ...baseRules,
      "Use the input images as environment style and mood references.",
      "Borrow the color palette, atmosphere, lighting quality, weather, material feeling, surface texture, and artistic finish, but let the scene layout follow the user's request.",
      "Avoid unrelated architecture, added subjects, text, watermark, and excessive layout changes unless requested.",
    ].join("\n");
  }

  if (mode === "creative") {
    return [
      ...baseRules,
      "Use the input images as loose environment inspiration.",
      "Keep recognizable mood, material language, lighting atmosphere, and visual motifs, but allow creative reinterpretation and improvement.",
      "Maintain coherent perspective, readable space, professional environment composition, and avoid artifacts, text, or watermark.",
    ].join("\n");
  }

  return [
    ...baseRules,
    "Use the first input image as the exact scene structure reference.",
    "Preserve the original camera angle, framing, horizon line, vanishing points, perspective, terrain shape, room shape, building silhouettes, architecture layout, floor/wall/ceiling relationships, object positions, scale, lighting direction, color relationships, and major damage or surface patterns.",
    "Do not add new architecture. Do not remove architecture. Do not move key objects. Avoid unrelated added subjects. Do not crop, zoom, rotate, reframe, simplify, or redesign the scene.",
    "Only improve clarity, texture fidelity, edge cleanliness, lighting quality, atmosphere, and render polish while keeping the original scene structure unchanged.",
  ].join("\n");
}

function ensureNodeStatus(node) {
  let status = node.querySelector(".node-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "node-status";
    node.appendChild(status);
  }
  return status;
}

function uploadFilesToImageNode(node, files) {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (!node || !imageFiles.length) return;

  node.dataset.fileName = imageFiles.length === 1 ? imageFiles[0].name : `${imageFiles.length} 张图片`;
  const nameEl = node.querySelector(".upload-name");
  if (nameEl) nameEl.textContent = node.dataset.fileName;

  const preview = node.querySelector(".upload-preview");
  const status = ensureNodeStatus(node);
  status.textContent = `正在上传 ${imageFiles.length} 张图片...`;
  if (preview) {
    preview.innerHTML = imageFiles.map((file) => `<img src="${URL.createObjectURL(file)}" alt="">`).join("");
  }

  Promise.all(imageFiles.map(uploadImageFile))
    .then((uploadedUrls) => {
      node.dataset.imageUrls = JSON.stringify(uploadedUrls);
      node.dataset.imageDataUrl = uploadedUrls[0] || "";
      renderNodeImagePreview(node);
      status.textContent = `${uploadedUrls.length} 张图片已上传并保存。`;
      saveCurrentProject();
    })
    .catch((error) => {
      status.textContent = `上传失败：${error instanceof Error ? error.message : String(error)}`;
      saveCurrentProject();
    });
}

function hasDraggedImageFiles(dataTransfer) {
  return [...(dataTransfer?.items || [])].some((item) => item.kind === "file" && item.type.startsWith("image/"));
}

function hasDraggedVideoFiles(dataTransfer) {
  return [...(dataTransfer?.items || [])].some((item) => item.kind === "file" && item.type.startsWith("video/"));
}

function hasDraggedMediaFiles(dataTransfer) {
  return hasDraggedImageFiles(dataTransfer) || hasDraggedVideoFiles(dataTransfer);
}

function hasDraggedMemory(dataTransfer) {
  return [...(dataTransfer?.types || [])].includes("application/x-aivideobox-memory");
}

function getImageFilesFromDataTransfer(dataTransfer) {
  return [...(dataTransfer?.files || [])].filter((file) => file.type.startsWith("image/"));
}

function getVideoFilesFromDataTransfer(dataTransfer) {
  return [...(dataTransfer?.files || [])].filter((file) => file.type.startsWith("video/"));
}

function createImageInputNodeFromDrop(files, clientX, clientY) {
  const point = clientPointToWorldPoint(clientX, clientY);
  const title = files.length === 1 ? stripFileExtension(files[0].name) : `${files.length} 张上传图片`;
  const node = createNode({
    type: "image",
    title,
    content: "",
    x: point.x - 129,
    y: point.y - 70,
    fileName: files.length === 1 ? files[0].name : `${files.length} 张图片`,
    imageRole: "general",
    imagePurpose: "自定义",
    referenceMode: "structureStyle",
  });
  selectNode(node);
  uploadFilesToImageNode(node, files);
  saveCurrentProject();
}

function uploadFilesToVideoNode(node, files) {
  const videoFiles = files.filter((file) => file.type.startsWith("video/"));
  if (!node || !videoFiles.length) return;

  const file = videoFiles[0];
  node.dataset.fileName = file.name;
  const nameEl = node.querySelector(".upload-name");
  if (nameEl) nameEl.textContent = node.dataset.fileName;

  const preview = node.querySelector(".upload-preview");
  const status = ensureNodeStatus(node);
  status.textContent = "正在上传视频...";
  if (preview) {
    preview.innerHTML = `<video src="${URL.createObjectURL(file)}" muted controls playsinline></video>`;
  }

  uploadMediaFile(file)
    .then((uploadedUrl) => {
      node.dataset.videoUrls = JSON.stringify([uploadedUrl]);
      node.dataset.videoDataUrl = uploadedUrl;
      renderNodeVideoPreview(node);
      status.textContent = "视频已上传并保存。";
      saveCurrentProject();
    })
    .catch((error) => {
      status.textContent = `视频上传失败：${error instanceof Error ? error.message : String(error)}`;
      saveCurrentProject();
    });
}

function createVideoInputNodeFromDrop(files, clientX, clientY) {
  const point = clientPointToWorldPoint(clientX, clientY);
  const file = files[0];
  const node = createNode({
    type: "video",
    title: stripFileExtension(file.name),
    content: "",
    x: point.x - 129,
    y: point.y - 70,
    fileName: file.name,
    videoMode: "video-to-video",
    videoDuration: "5",
  });
  selectNode(node);
  uploadFilesToVideoNode(node, files);
  saveCurrentProject();
}

function clientPointToWorldPoint(clientX, clientY) {
  const rect = canvasContent.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / viewport.scale,
    y: (clientY - rect.top) / viewport.scale,
  };
}

function stripFileExtension(fileName) {
  return String(fileName || "上传图片").replace(/\.[^.]+$/, "") || "上传图片";
}

function moveNode(node, x, y) {
  const nextX = Math.max(-6000, Math.min(11500, x));
  const nextY = Math.max(-6000, Math.min(11500, y));
  node.dataset.x = String(Math.round(nextX));
  node.dataset.y = String(Math.round(nextY));
  node.style.left = `${nextX}px`;
  node.style.top = `${nextY}px`;
}

function startSelectionBoxFromPoint(clientX, clientY) {
  const rect = canvasContent.getBoundingClientRect();
  const start = {
    x: (clientX - rect.left) / viewport.scale,
    y: (clientY - rect.top) / viewport.scale,
  };
  const box = document.createElement("div");
  box.className = "selection-box";
  canvasContent.appendChild(box);
  selectionBoxState = { start, box };
}

function updateSelectionBox(event) {
  const rect = canvasContent.getBoundingClientRect();
  const current = {
    x: (event.clientX - rect.left) / viewport.scale,
    y: (event.clientY - rect.top) / viewport.scale,
  };
  const left = Math.min(selectionBoxState.start.x, current.x);
  const top = Math.min(selectionBoxState.start.y, current.y);
  const width = Math.abs(current.x - selectionBoxState.start.x);
  const height = Math.abs(current.y - selectionBoxState.start.y);
  Object.assign(selectionBoxState.box.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });

  const selected = [...canvasContent.querySelectorAll(".node")].filter((node) => rectsOverlap(getNodeWorldRect(node), { left, top, right: left + width, bottom: top + height }));
  selectNodes(selected);
}

function finishSelectionBox() {
  selectionBoxState.box.remove();
  selectionBoxState = null;
}

function getNodeWorldRect(node) {
  const left = Number(node.dataset.x) || 0;
  const top = Number(node.dataset.y) || 0;
  return {
    left,
    top,
    right: left + node.offsetWidth,
    bottom: top + node.offsetHeight,
  };
}

function rectsOverlap(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function isTextEditingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function startWire(node, port, event) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add("temp-wire");
  connectorSvg.appendChild(path);
  wireState = { node, port, path, startPoint: getPortPoint(port) };
  node.classList.add("linking");
  updateTempWire(event);
}

function updateTempWire(event) {
  const startSide = wireState.port.classList.contains("out") ? "right" : "left";
  const start = wireState.startPoint;
  const rect = canvasContent.getBoundingClientRect();
  const end = {
    x: (event.clientX - rect.left) / viewport.scale,
    y: (event.clientY - rect.top) / viewport.scale,
  };
  const mid = Math.max(80, Math.abs(end.x - start.x) * 0.45);
  const c1 = startSide === "left" ? start.x - mid : start.x + mid;
  wireState.path.setAttribute("d", `M${start.x} ${start.y} C${c1} ${start.y} ${end.x - mid} ${end.y} ${end.x} ${end.y}`);
}

function finishWire(event) {
  const targetPort = findPortNear(event.clientX, event.clientY);
  const targetNode = targetPort?.closest(".node");
  if (targetNode && targetNode !== wireState.node) {
    addConnection(wireState.node, targetNode, sideForPort(wireState.port), sideForPort(targetPort));
  }
  wireState.node.classList.remove("linking");
  wireState.path.remove();
  wireState = null;
  clearPortHighlights();
}

function addConnection(fromNode, toNode, fromSide, toSide) {
  const duplicate = [...connectorSvg.querySelectorAll("path:not(.temp-wire)")].some(
    (path) =>
      path.dataset.from === fromNode.id &&
      path.dataset.to === toNode.id &&
      path.dataset.fromSide === fromSide &&
      path.dataset.toSide === toSide,
  );
  if (duplicate) return;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.dataset.from = fromNode.id;
  path.dataset.to = toNode.id;
  path.dataset.fromSide = fromSide;
  path.dataset.toSide = toSide;
  connectorSvg.appendChild(path);
  updateConnections();
  saveCurrentProject();
}

function renderPortConnectionMenu(port) {
  if (!portConnectionContextMenu) return;
  const list = portConnectionContextMenu.querySelector(".port-connection-list");
  if (!list) return;
  const connections = getConnectionsForPort(port);
  if (!connections.length) {
    list.innerHTML = '<button class="empty" type="button" disabled>暂无连接</button>';
    return;
  }
  list.innerHTML = connections
    .map(
      (connection, index) => `
        <button type="button" data-connection-index="${index}">
          <span>${escapeHtml(connection.label)}</span>
          <small>删除连接线</small>
        </button>
      `,
    )
    .join("");
}

function getConnectionsForPort(port) {
  const node = port?.closest(".node");
  if (!node) return [];
  const side = sideForPort(port);
  return [...connectorSvg.querySelectorAll("path:not(.temp-wire)")].reduce((items, path) => {
    const isFrom = path.dataset.from === node.id && path.dataset.fromSide === side;
    const isTo = path.dataset.to === node.id && path.dataset.toSide === side;
    if (!isFrom && !isTo) return items;
    const otherNode = document.getElementById(isFrom ? path.dataset.to : path.dataset.from);
    const otherTitle = otherNode?.querySelector(".node-title strong")?.textContent || "未知节点";
    const direction = isFrom ? "输出到" : "输入自";
    items.push({ path, label: `${direction} ${otherTitle}` });
    return items;
  }, []);
}

function updateConnections() {
  connectorSvg.querySelectorAll("path:not(.temp-wire)").forEach((path) => {
    const from = document.getElementById(path.dataset.from);
    const to = document.getElementById(path.dataset.to);
    if (!from || !to) {
      path.remove();
      return;
    }
    const start = getNodePortPoint(from, path.dataset.fromSide || "right");
    const end = getNodePortPoint(to, path.dataset.toSide || "left");
    const mid = Math.max(90, Math.abs(end.x - start.x) * 0.5);
    const c1 = path.dataset.fromSide === "left" ? start.x - mid : start.x + mid;
    const c2 = path.dataset.toSide === "right" ? end.x + mid : end.x - mid;
    path.setAttribute("d", `M${start.x} ${start.y} C${c1} ${start.y} ${c2} ${end.y} ${end.x} ${end.y}`);
  });
}

function saveCurrentProject() {
  if (!currentProject || isRestoring) return;
  if (activeFolder) {
    saveActiveFolder();
    return;
  }
  const data = serializeCanvasData();
  if (!shouldSaveProjectData(currentProject, data)) return;
  try {
    localStorage.setItem(projectKey(currentProject), JSON.stringify(data));
  } catch (error) {
    console.error("Project save failed", error);
  }
  updateProjectCardThumbnail(currentProject, data);
  saveSharedProject(currentProject, data);
  ensureSharedProjectImages(currentProject, data);
}

function shouldSaveProjectData(name, nextData) {
  const nextNodeCount = Array.isArray(nextData?.nodes) ? nextData.nodes.length : 0;
  if (nextNodeCount > 0) return true;
  const existing = readJson(projectKey(name), null);
  const backup = readJson(`${projectKey(name)}.backup`, null);
  const existingNodeCount = Array.isArray(existing?.nodes) ? existing.nodes.length : 0;
  const backupNodeCount = Array.isArray(backup?.nodes) ? backup.nodes.length : 0;
  if (existingNodeCount > 0 || backupNodeCount > 0) {
    console.warn(`Skipped empty save for ${name}`);
    return false;
  }
  return true;
}

async function ensureSharedProjectImages(name, data) {
  let changed = false;
  for (const node of data.nodes || []) {
    changed = (await makeNodeImagesShareable(node)) || changed;
  }
  if (changed) {
    try {
      localStorage.setItem(projectKey(name), JSON.stringify(data));
    } catch {}
    saveSharedProject(name, data);
  }
}

async function makeNodeImagesShareable(node) {
  let changed = false;
  if (node.imageDataUrl?.startsWith("data:image/")) {
    try {
      const url = await uploadDataUrlAsSharedImage(node.imageDataUrl, node.fileName || `${node.title || "image"}.png`);
      node.imageUrls = uniqueValues([...(Array.isArray(node.imageUrls) ? node.imageUrls : []), url]);
      node.imageDataUrl = "";
      node.imageDataKey = "";
      changed = true;
    } catch (error) {
      console.warn("Shared image upload failed", error);
    }
  }
  if (node.referenceImageDataUrl?.startsWith("data:image/")) {
    try {
      const url = await uploadDataUrlAsSharedImage(node.referenceImageDataUrl, node.referenceFileName || `${node.title || "reference"}.png`);
      node.referenceImageUrls = uniqueValues([...(Array.isArray(node.referenceImageUrls) ? node.referenceImageUrls : []), url]);
      node.referenceImageDataUrl = "";
      node.referenceImageDataKey = "";
      changed = true;
    } catch (error) {
      console.warn("Shared reference image upload failed", error);
    }
  }
  for (const child of Array.isArray(node.folderNodes) ? node.folderNodes : []) {
    changed = (await makeNodeImagesShareable(child)) || changed;
  }
  return changed;
}

async function uploadDataUrlAsSharedImage(imageDataUrl, fileName) {
  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, imageDataUrl }),
  });
  const result = await readResponseJson(response);
  if (!response.ok || !result.url) throw new Error(formatApiError(result, `HTTP ${response.status}`));
  return result.url;
}

async function saveSharedProject(name, data) {
  if (!hasProjectNodes(data)) return;
  try {
    await fetch(SHARED_PROJECTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "project", name, data: stripLocalImageKeysFromProject(data) }),
    });
  } catch (error) {
    console.warn("Shared project save failed", error);
  }
}

function hasProjectNodes(data) {
  return Array.isArray(data?.nodes) && data.nodes.length > 0;
}

function stripLocalImageKeysFromProject(data) {
  return {
    ...data,
    nodes: (data.nodes || []).map(stripLocalImageKeysFromNode),
  };
}

function stripLocalImageKeysFromNode(node) {
  const clean = { ...node };
  if (clean.imageDataKey) clean.imageDataKey = "";
  if (clean.referenceImageDataKey) clean.referenceImageDataKey = "";
  if (Array.isArray(clean.folderNodes)) clean.folderNodes = clean.folderNodes.map(stripLocalImageKeysFromNode);
  return clean;
}

async function deleteSharedProject(name) {
  try {
    await fetch(`${SHARED_PROJECTS_API}?name=${encodeURIComponent(name)}`, { method: "DELETE" });
  } catch (error) {
    console.warn("Shared project delete failed", error);
  }
}

function serializeCanvasData() {
  const nodes = serializeNodes([...canvasContent.querySelectorAll(".node")]);
  const connections = serializeConnections();
  return { nodes, connections };
}

function serializeNodes(nodes) {
  return nodes.map((node) => {
    const imageIsData = node.dataset.imageDataUrl?.startsWith("data:image/");
    const imageDataKey = imageIsData ? projectImageKey(currentProject, node.id, "upload") : "";
    const referenceIsData = node.dataset.referenceImageDataUrl?.startsWith("data:image/");
    const referenceImageDataKey = referenceIsData ? projectImageKey(currentProject, node.id, "reference") : "";

    if (imageDataKey) storeProjectImage(imageDataKey, node.dataset.imageDataUrl);
    if (referenceImageDataKey) storeProjectImage(referenceImageDataKey, node.dataset.referenceImageDataUrl);

    return {
      id: node.id,
      type: node.dataset.type,
      tone: node.dataset.tone,
      title: node.querySelector(".node-title strong")?.textContent || "节点",
      content: getNodeContent(node),
      imagePurpose: node.dataset.imagePurpose || "自定义",
      referenceMode: node.dataset.referenceMode || "structureStyle",
      imageRole: node.dataset.imageRole || "general",
      imageQuality: node.dataset.imageQuality || "high",
      imageModel: node.dataset.imageModel || "gpt-image-2-official",
      apimartChannel: "b",
      fileName: node.dataset.fileName || "",
      imageUrls: parseJsonArray(node.dataset.imageUrls),
      imageDataKey,
      imageDataUrl: imageDataKey ? "" : node.dataset.imageDataUrl || "",
      referenceImageUrls: parseJsonArray(node.dataset.referenceImageUrls),
      referenceImageDataKey,
      referenceImageDataUrl: referenceImageDataKey ? "" : node.dataset.referenceImageDataUrl || "",
      referenceFileName: node.dataset.referenceFileName || "",
      generatedImageUrl: node.dataset.generatedImageUrl || "",
      generatedImageUrls: parseJsonArray(node.dataset.generatedImageUrls),
      videoUrls: parseJsonArray(node.dataset.videoUrls),
      videoDataUrl: node.dataset.videoDataUrl || "",
      referenceVideoUrls: parseJsonArray(node.dataset.referenceVideoUrls),
      referenceVideoUrl: node.dataset.referenceVideoUrl || "",
      generatedVideoUrl: node.dataset.generatedVideoUrl || "",
      generatedVideoUrls: parseJsonArray(node.dataset.generatedVideoUrls),
      videoMode: normalizeVideoModeValue(node.dataset.videoMode),
      videoDuration: node.dataset.videoDuration || "5",
      videoModel: normalizeVideoModelValue(node.dataset.videoModel),
      videoAspectRatio: node.dataset.videoAspectRatio || "16:9",
      videoResolution: node.dataset.videoResolution || "1080p",
      videoSeed: node.dataset.videoSeed || "",
      videoGenerateAudio: node.dataset.videoGenerateAudio === "true",
      videoReturnLastFrame: node.dataset.videoReturnLastFrame === "true",
      videoWebSearch: node.dataset.videoWebSearch === "true",
      videoFirstFrameUrl: node.dataset.videoFirstFrameUrl || "",
      videoLastFrameUrl: node.dataset.videoLastFrameUrl || "",
      videoReferenceAudioUrl: node.dataset.videoReferenceAudioUrl || "",
      videoReferenceAudioUrls: parseJsonArray(node.dataset.videoReferenceAudioUrls),
      folderNodes: parseJsonArray(node.dataset.folderNodes),
      folderConnections: parseJsonArray(node.dataset.folderConnections),
      x: Number(node.dataset.x),
      y: Number(node.dataset.y),
    };
  });
}

function serializeConnections(filter = () => true) {
  return [...connectorSvg.querySelectorAll("path:not(.temp-wire)")].filter(filter).map((path) => ({
    from: path.dataset.from,
    to: path.dataset.to,
    fromSide: path.dataset.fromSide,
    toSide: path.dataset.toSide,
  }));
}

function restoreProject(name) {
  const data = readProjectDataWithBackup(name);
  backupProjectData(name, data);
  migrateProjectMemoriesToGlobal(data.memories);
  loadGlobalMemories();
  renderConversationMemories();
  restoreCanvasData(data);
  loadSharedProject(name);
}

function readProjectDataWithBackup(name) {
  const data = readJson(projectKey(name), { nodes: [], connections: [], memories: [] });
  const backup = readJson(`${projectKey(name)}.backup`, null);
  const dataNodeCount = Array.isArray(data?.nodes) ? data.nodes.length : 0;
  const backupNodeCount = Array.isArray(backup?.nodes) ? backup.nodes.length : 0;
  if (dataNodeCount === 0 && backupNodeCount > 0) {
    try {
      localStorage.setItem(projectKey(name), JSON.stringify(backup));
      console.warn(`Restored ${name} from local backup`);
    } catch (error) {
      console.warn("Project backup restore save failed", error);
    }
    return backup;
  }
  return data;
}

async function loadSharedProject(name) {
  try {
    const response = await fetch(`${SHARED_PROJECTS_API}?name=${encodeURIComponent(name)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const data = result.data;
    if (!data || !Array.isArray(data.nodes)) return;
    if (!shouldUseSharedProjectData(name, data)) return;
    localStorage.setItem(projectKey(name), JSON.stringify(data));
    updateProjectCardThumbnail(name, data);
    if (currentProject !== name || activeFolder) return;
    clearCanvas();
    restoreCanvasData(data);
    syncFolderUi();
    refreshConnectionsSoon();
  } catch (error) {
    console.warn("Shared project load failed", error);
  }
}

function shouldUseSharedProjectData(name, sharedData) {
  const localData = readJson(projectKey(name), null);
  const localNodeCount = Array.isArray(localData?.nodes) ? localData.nodes.length : 0;
  const sharedNodeCount = Array.isArray(sharedData?.nodes) ? sharedData.nodes.length : 0;
  if (localNodeCount > 0 && sharedNodeCount < localNodeCount) {
    console.warn(`Skipped smaller shared project overwrite for ${name}`);
    return false;
  }
  return true;
}

function backupProjectData(name, data) {
  if (!name || !data || !Array.isArray(data.nodes) || !data.nodes.length) return;
  try {
    localStorage.setItem(`${projectKey(name)}.backup`, JSON.stringify(data));
  } catch (error) {
    console.warn("Project backup failed", error);
  }
}

function restoreCanvasData(data) {
  isRestoring = true;
  const restoredIds = new Set();
  (data.nodes || []).forEach((saved) => {
    let node = null;
    try {
      node = createNode(saved);
      restoredIds.add(node.id);
    } catch (error) {
      console.error("Node restore failed", saved, error);
      return;
    }
    try {
    node.dataset.imagePurpose = saved.imagePurpose || "自定义";
    node.dataset.referenceMode = saved.referenceMode || "structureStyle";
    node.dataset.imageRole = saved.imageRole || "general";
    delete node.dataset.imageRatio;
    delete node.dataset.imageResolution;
    node.dataset.imageQuality = saved.imageQuality || "high";
    node.dataset.imageModel = normalizeImageModel(saved.imageModel || "gpt-image-2-official");
    node.dataset.apimartChannel = "b";
    if (saved.fileName) node.dataset.fileName = saved.fileName;
    if (Array.isArray(saved.imageUrls)) node.dataset.imageUrls = JSON.stringify(saved.imageUrls);
    if (saved.imageDataUrl) node.dataset.imageDataUrl = saved.imageDataUrl;
    if (Array.isArray(saved.referenceImageUrls)) node.dataset.referenceImageUrls = JSON.stringify(saved.referenceImageUrls);
    if (saved.referenceImageDataUrl) node.dataset.referenceImageDataUrl = saved.referenceImageDataUrl;
    if (saved.referenceFileName) node.dataset.referenceFileName = saved.referenceFileName;
    if (saved.generatedImageUrl) node.dataset.generatedImageUrl = saved.generatedImageUrl;
    if (Array.isArray(saved.generatedImageUrls)) node.dataset.generatedImageUrls = JSON.stringify(saved.generatedImageUrls);
    if (Array.isArray(saved.videoUrls)) node.dataset.videoUrls = JSON.stringify(saved.videoUrls);
    if (saved.videoDataUrl) node.dataset.videoDataUrl = saved.videoDataUrl;
    if (Array.isArray(saved.referenceVideoUrls)) node.dataset.referenceVideoUrls = JSON.stringify(saved.referenceVideoUrls);
    if (saved.referenceVideoUrl) node.dataset.referenceVideoUrl = saved.referenceVideoUrl;
    if (saved.generatedVideoUrl) node.dataset.generatedVideoUrl = saved.generatedVideoUrl;
    if (Array.isArray(saved.generatedVideoUrls)) node.dataset.generatedVideoUrls = JSON.stringify(saved.generatedVideoUrls);
    node.dataset.videoMode = normalizeVideoModeValue(saved.videoMode);
    node.dataset.videoDuration = saved.videoDuration || "5";
    node.dataset.videoModel = normalizeVideoModelValue(saved.videoModel);
    node.dataset.videoAspectRatio = saved.videoAspectRatio || "16:9";
    node.dataset.videoResolution = saved.videoResolution || "1080p";
    node.dataset.videoSeed = saved.videoSeed || "";
    node.dataset.videoGenerateAudio = String(Boolean(saved.videoGenerateAudio));
    node.dataset.videoReturnLastFrame = String(Boolean(saved.videoReturnLastFrame));
    node.dataset.videoWebSearch = String(Boolean(saved.videoWebSearch));
    if (saved.videoFirstFrameUrl) node.dataset.videoFirstFrameUrl = saved.videoFirstFrameUrl;
    if (saved.videoLastFrameUrl) node.dataset.videoLastFrameUrl = saved.videoLastFrameUrl;
    if (saved.videoReferenceAudioUrl) node.dataset.videoReferenceAudioUrl = saved.videoReferenceAudioUrl;
    if (Array.isArray(saved.videoReferenceAudioUrls)) node.dataset.videoReferenceAudioUrls = JSON.stringify(saved.videoReferenceAudioUrls);
    if (Array.isArray(saved.folderNodes)) node.dataset.folderNodes = JSON.stringify(saved.folderNodes);
    if (Array.isArray(saved.folderConnections)) node.dataset.folderConnections = JSON.stringify(saved.folderConnections);
    node.dataset.tone = saved.tone || node.dataset.tone;
    setNodeType(node, saved.type, saved.content);
    renderNodeImagePreview(node);
    } catch (error) {
      console.error("Node data hydrate failed", saved, error);
      return;
    }
    if (saved.imageDataKey) {
      loadProjectImage(saved.imageDataKey).then((value) => {
        if (!value) return;
        node.dataset.imageDataUrl = value;
        renderNodeImagePreview(node);
      });
    }
    if (saved.referenceImageDataKey) {
      loadProjectImage(saved.referenceImageDataKey).then((value) => {
        if (value) node.dataset.referenceImageDataUrl = value;
      });
    }
  });
  (data.connections || []).forEach((saved) => {
    if (!restoredIds.has(saved.from) || !restoredIds.has(saved.to)) return;
    const from = document.getElementById(saved.from);
    const to = document.getElementById(saved.to);
    if (from && to) addConnection(from, to, saved.fromSide || "right", saved.toSide || "left");
  });
  isRestoring = false;
  refreshConnectionsSoon();
}

function clearCanvas() {
  canvasContent.querySelectorAll(".node").forEach((node) => node.remove());
  connectorSvg.innerHTML = "";
  connectorSvg?.setAttribute("viewBox", "0 0 5000 5000");
  selectNode(null);
}

function selectNode(node, additive = false) {
  if (!additive) clearSelectedNodes();
  selectedNode = node;
  if (node) addSelectedNode(node);
  if (node) {
    document.body.tabIndex = -1;
    document.body.focus();
  }
}

function addSelectedNode(node) {
  selectedNodes.add(node);
  node.classList.add("selected");
  selectedNode = node;
}

function clearSelectedNodes() {
  selectedNodes.forEach((node) => node.classList.remove("selected"));
  selectedNodes.clear();
  selectedNode = null;
}

function selectNodes(nodes) {
  clearSelectedNodes();
  nodes.forEach(addSelectedNode);
  if (!nodes.length) selectedNode = null;
}

function zoomCanvas(factor, clientX, clientY) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const px = clientX === undefined ? rect.width / 2 : clientX - rect.left;
  const py = clientY === undefined ? rect.height / 2 : clientY - rect.top;
  const wx = (px - viewport.x) / viewport.scale;
  const wy = (py - viewport.y) / viewport.scale;
  const scale = Math.min(3.5, Math.max(0.2, viewport.scale * factor));
  viewport.x = px - wx * scale;
  viewport.y = py - wy * scale;
  viewport.scale = scale;
  applyViewport();
}

function resetViewport() {
  const bounds = getNodesBounds([...canvasContent.querySelectorAll(".node")]);
  if (!bounds || !canvas) {
    viewport = { x: 0, y: 0, scale: 1 };
    applyViewport();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const padding = 140;
  const availableWidth = Math.max(320, rect.width - padding * 2);
  const availableHeight = Math.max(240, rect.height - padding * 2);
  const scale = Math.min(1, Math.max(0.25, Math.min(availableWidth / bounds.width, availableHeight / bounds.height)));
  viewport = {
    x: Math.round(rect.width / 2 - ((bounds.left + bounds.width / 2) * scale)),
    y: Math.round(rect.height / 2 - ((bounds.top + bounds.height / 2) * scale)),
    scale,
  };
  applyViewport();
  refreshConnectionsSoon();
}

function arrangeNodes() {
  const selected = [...selectedNodes].filter((node) => node.isConnected);
  const nodes = selected.length ? selected : [...canvasContent.querySelectorAll(".node")];
  if (!nodes.length) return;
  arrangeExistingNodeLayout(nodes);
  selectNodes(nodes);
  resetViewport();
  saveCurrentProject();
  refreshConnectionsSoon();
}

function getNodesBounds(nodes) {
  const visibleNodes = nodes.filter((node) => node.isConnected);
  if (!visibleNodes.length) return null;
  const left = Math.min(...visibleNodes.map((node) => Number(node.dataset.x) || 0));
  const top = Math.min(...visibleNodes.map((node) => Number(node.dataset.y) || 0));
  const right = Math.max(...visibleNodes.map((node) => (Number(node.dataset.x) || 0) + (node.offsetWidth || 260)));
  const bottom = Math.max(...visibleNodes.map((node) => (Number(node.dataset.y) || 0) + (node.offsetHeight || 180)));
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function arrangeExistingNodeLayout(nodes) {
  const columnThreshold = 190;
  const rowGap = 42;
  const columns = [];

  [...nodes]
    .sort((a, b) => nodeOriginalLeft(a) - nodeOriginalLeft(b))
    .forEach((node) => {
      const left = nodeOriginalLeft(node);
      let column = columns.find((item) => Math.abs(item.anchorX - left) <= columnThreshold);
      if (!column) {
        column = { anchorX: left, nodes: [] };
        columns.push(column);
      }
      column.nodes.push(node);
      column.anchorX = column.nodes.reduce((sum, item) => sum + nodeOriginalLeft(item), 0) / column.nodes.length;
    });

  columns
    .sort((a, b) => a.anchorX - b.anchorX)
    .forEach((column) => {
      const sorted = column.nodes.sort((a, b) => nodeOriginalTop(a) - nodeOriginalTop(b));
      const alignedX = Math.round(column.anchorX);
      let nextY = Math.min(...sorted.map(nodeOriginalTop));
      sorted.forEach((node, index) => {
        moveNode(node, alignedX, nextY);
        nextY += Math.max(170, node.offsetHeight || 0) + rowGap;
      });
    });
}

function nodeTypeRank(node) {
  return { image: 0, text: 1, video: 2 }[node?.dataset.type] ?? 3;
}

function nodeOriginalTop(node) {
  return Number(node?.dataset.y) || 0;
}

function nodeOriginalLeft(node) {
  return Number(node?.dataset.x) || 0;
}

function applyViewport() {
  canvasContent.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
  if (canvasZoomLabel) canvasZoomLabel.textContent = `${Math.round(viewport.scale * 100)}%`;
}

function showMenu(menu, x, y) {
  hideMenus();
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add("show");
  menu.setAttribute("aria-hidden", "false");
}

function hideMenus() {
  canvasContextMenu.classList.remove("show");
  nodeContextMenu.classList.remove("show");
  assetContextMenu?.classList.remove("show");
  document.querySelector("#templateContextMenu")?.classList.remove("show");
  imageUploadContextMenu?.classList.remove("show");
  portConnectionContextMenu?.classList.remove("show");
  canvasContextMenu.setAttribute("aria-hidden", "true");
  nodeContextMenu.setAttribute("aria-hidden", "true");
  assetContextMenu?.setAttribute("aria-hidden", "true");
  document.querySelector("#templateContextMenu")?.setAttribute("aria-hidden", "true");
  imageUploadContextMenu?.setAttribute("aria-hidden", "true");
  portConnectionContextMenu?.setAttribute("aria-hidden", "true");
  contextAssetId = "";
  contextTemplateId = "";
  contextUploadNode = null;
  contextPort = null;
}

function highlightNearestPort(event) {
  clearPortHighlights();
  const port = findPortNear(event.clientX, event.clientY);
  if (port && port.closest(".node") !== wireState.node) port.classList.add("connect-target");
}

function clearPortHighlights() {
  document.querySelectorAll(".node-port.connect-target").forEach((port) => port.classList.remove("connect-target"));
}

function findPortNear(clientX, clientY) {
  const direct = document.elementFromPoint(clientX, clientY)?.closest(".node-port");
  if (direct) return direct;
  let best = null;
  let distance = Infinity;
  document.querySelectorAll(".node-port").forEach((port) => {
    const rect = port.getBoundingClientRect();
    const d = Math.hypot(rect.left + rect.width / 2 - clientX, rect.top + rect.height / 2 - clientY);
    if (d < distance) {
      distance = d;
      best = port;
    }
  });
  return distance <= 30 ? best : null;
}

function getPortPoint(port) {
  const portRect = port.getBoundingClientRect();
  const canvasRect = canvasContent.getBoundingClientRect();
  return {
    x: (portRect.left + portRect.width / 2 - canvasRect.left) / viewport.scale,
    y: (portRect.top + portRect.height / 2 - canvasRect.top) / viewport.scale,
  };
}

function getNodePortPoint(node, side) {
  return getPortPoint(node.querySelector(side === "right" ? ".node-port.out" : ".node-port.in"));
}

function sideForPort(port) {
  return port.classList.contains("out") ? "right" : "left";
}

function getNodeContent(node) {
  const structuredFields = node.querySelectorAll(".text-brief-field");
  if (structuredFields.length) {
    const fields = {
      requirement: "",
      revision: "",
      scene: "",
      negative: "",
    };
    structuredFields.forEach((field) => {
      fields[field.dataset.textField] = field.value;
    });
    return formatTextNodeFields(fields);
  }
  const input = node.querySelector(".text-input, .mini-textarea");
  return input ? input.value : node.querySelector(".node-description")?.textContent || "";
}

function createNodeId() {
  nodeCounter += 1;
  return `node-${Date.now()}-${nodeCounter}-${Math.random().toString(16).slice(2, 8)}`;
}

function projectKey(name) {
  return `aivideobox.project.v2:${name}`;
}

function projectImageKey(projectName, nodeId, slot) {
  return `${projectName}::${nodeId}::${slot}`;
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        request.result.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        resolve(db);
        return;
      }
      db.close();
      const upgradeRequest = indexedDB.open(IMAGE_DB_NAME, db.version + 1);
      upgradeRequest.onupgradeneeded = () => {
        if (!upgradeRequest.result.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          upgradeRequest.result.createObjectStore(IMAGE_STORE_NAME);
        }
      };
      upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
      upgradeRequest.onerror = () => reject(upgradeRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function storeProjectImage(key, value) {
  if (!key || !value) return;
  try {
    const db = await openImageDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
      transaction.objectStore(IMAGE_STORE_NAME).put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch (error) {
    console.error("Image save failed", error);
  }
}

async function loadProjectImage(key) {
  if (!key) return "";
  try {
    const db = await openImageDb();
    const value = await new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
      const request = transaction.objectStore(IMAGE_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || "");
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch (error) {
    console.error("Image load failed", error);
    return "";
  }
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

window.aivideoboxRecovery = function aivideoboxRecovery() {
  const rows = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("aivideobox.project.v2:")) continue;
    const data = readJson(key, null);
    rows.push({
      key,
      nodes: Array.isArray(data?.nodes) ? data.nodes.length : 0,
      connections: Array.isArray(data?.connections) ? data.connections.length : 0,
      size: localStorage.getItem(key)?.length || 0,
    });
  }
  console.table(rows);
  return rows;
};

window.aivideoboxRestoreBackups = function aivideoboxRestoreBackups() {
  const restored = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("aivideobox.project.v2:") || !key.endsWith(".backup")) continue;
    const baseKey = key.replace(/\.backup$/, "");
    const current = readJson(baseKey, null);
    const backup = readJson(key, null);
    const currentNodes = Array.isArray(current?.nodes) ? current.nodes.length : 0;
    const backupNodes = Array.isArray(backup?.nodes) ? backup.nodes.length : 0;
    if (currentNodes === 0 && backupNodes > 0) {
      localStorage.setItem(baseKey, JSON.stringify(backup));
      restored.push({ key: baseKey, nodes: backupNodes });
    }
  }
  console.table(restored);
  return restored;
};

window.aivideoboxExportFullBackup = async function aivideoboxExportFullBackup() {
  const local = Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) =>
        key.startsWith("aivideobox.project.v2:") ||
        key === PROJECT_LIST_KEY ||
        key === GLOBAL_MEMORY_KEY ||
        key === LOCAL_ASSETS_KEY ||
        key === TEMPLATE_LIBRARY_KEY)
      .map((key) => [key, localStorage.getItem(key)]),
  );
  const images = await exportImageDb();
  const inlined = await inlineReachableProjectImages(local);
  downloadJson({ local, images, inlined, exportedAt: new Date().toISOString() }, "aivideobox-full-backup.json");
  return {
    localKeys: Object.keys(local).length,
    imageKeys: Object.keys(images).length,
    inlinedImages: countInlinedImages(inlined),
  };
};

window.aivideoboxImportFullBackup = async function aivideoboxImportFullBackup() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const backup = JSON.parse(await input.files[0].text());
    Object.entries(backup.local || {}).forEach(([key, value]) => localStorage.setItem(key, value));
    await importImageDb(backup.images || {});
    Object.entries(backup.inlined || {}).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    location.reload();
  };
  input.click();
};

async function exportImageDb() {
  try {
    const db = await openImageDb();
    if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
      db.close();
      return {};
    }
    const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const keys = await idbRequest(store.getAllKeys());
    const images = {};
    for (const key of keys) {
      images[key] = await idbRequest(store.get(key));
    }
    db.close();
    return images;
  } catch (error) {
    console.warn("Image DB export skipped", error);
    return {};
  }
}

async function importImageDb(images) {
  const db = await openImageDb();
  const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
  const store = transaction.objectStore(IMAGE_STORE_NAME);
  Object.entries(images).forEach(([key, value]) => store.put(value, key));
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function inlineReachableProjectImages(local) {
  const inlined = {};
  for (const [key, raw] of Object.entries(local)) {
    if (!key.startsWith("aivideobox.project.v2:")) continue;
    const data = safeParseJson(raw);
    if (!data?.nodes) continue;
    const next = structuredClone(data);
    await inlineProjectNodeImages(next.nodes);
    inlined[key] = next;
  }
  return inlined;
}

async function inlineProjectNodeImages(nodes) {
  for (const node of nodes || []) {
    await inlineNodeImageFields(node);
    if (Array.isArray(node.folderNodes)) await inlineProjectNodeImages(node.folderNodes);
  }
}

async function inlineNodeImageFields(node) {
  for (const key of ["generatedImageUrl", "imageDataUrl", "referenceImageDataUrl"]) {
    if (isRemoteImageUrl(node[key])) node[key] = await fetchImageAsDataUrl(node[key]) || node[key];
  }
  for (const key of ["generatedImageUrls", "imageUrls", "referenceImageUrls"]) {
    if (!Array.isArray(node[key])) continue;
    node[key] = await Promise.all(node[key].map(async (url) => isRemoteImageUrl(url) ? (await fetchImageAsDataUrl(url)) || url : url));
  }
}

async function fetchImageAsDataUrl(url) {
  try {
    const response = await fetch(url, { cache: "force-cache", mode: "cors" });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function countInlinedImages(projects) {
  let count = 0;
  Object.values(projects || {}).forEach((project) => {
    (project.nodes || []).forEach((node) => {
      const candidates = [];
      collectNodeThumbnailCandidates(node, candidates);
      count += candidates.filter((value) => typeof value === "string" && value.startsWith("data:image/")).length;
    });
  });
  return count;
}

function downloadJson(data, fileName) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

loadImageOptions();
loadGlobalMemories();
loadTemplates();
loadProjectList();
renderAssetsPage();
renderTemplatesPage();
showPage("home");
startSharedProjectAutoRefresh();

