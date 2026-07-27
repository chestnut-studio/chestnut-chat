type ExpansionState = {
  chatsOpen: boolean;
  projectsOpen: boolean;
  projects: Record<string, boolean>;
};

const STORAGE_KEY = "chestnut-sidebar-expansion";

function readState(): ExpansionState {
  if (!import.meta.client) {
    return { chatsOpen: true, projectsOpen: true, projects: {} };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { chatsOpen: true, projectsOpen: true, projects: {} };
    const parsed = JSON.parse(raw) as ExpansionState;
    return {
      chatsOpen: parsed.chatsOpen ?? true,
      projectsOpen: parsed.projectsOpen ?? true,
      projects: parsed.projects ?? {},
    };
  } catch {
    return { chatsOpen: true, projectsOpen: true, projects: {} };
  }
}

export function useSidebarExpansion() {
  const state = useState<ExpansionState>("sidebar-expansion", readState);

  function persist() {
    if (!import.meta.client) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  }

  function toggleChats() {
    state.value = { ...state.value, chatsOpen: !state.value.chatsOpen };
    persist();
  }

  function setChatsOpen(open: boolean) {
    if (state.value.chatsOpen === open) return;
    state.value = { ...state.value, chatsOpen: open };
    persist();
  }

  function toggleProjects() {
    state.value = { ...state.value, projectsOpen: !state.value.projectsOpen };
    persist();
  }

  function setProjectsOpen(open: boolean) {
    if (state.value.projectsOpen === open) return;
    state.value = { ...state.value, projectsOpen: open };
    persist();
  }

  function isProjectOpen(projectId: string) {
    return state.value.projects[projectId] ?? true;
  }

  function toggleProject(projectId: string) {
    const next = !isProjectOpen(projectId);
    state.value = {
      ...state.value,
      projects: { ...state.value.projects, [projectId]: next },
    };
    persist();
  }

  function setProjectOpen(projectId: string, open: boolean) {
    if (isProjectOpen(projectId) === open) return;
    state.value = {
      ...state.value,
      projects: { ...state.value.projects, [projectId]: open },
    };
    persist();
  }

  return {
    state,
    toggleChats,
    setChatsOpen,
    toggleProjects,
    setProjectsOpen,
    isProjectOpen,
    toggleProject,
    setProjectOpen,
  };
}
