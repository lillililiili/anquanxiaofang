import CustomersPage from "../features/resources/CustomersPage";
import ProjectsPage from "../features/resources/ProjectsPage";
import DevicesPage from "../features/resources/DevicesPage";
import TemplatesPage from "../features/resources/TemplatesPage";
import { useResources } from "../features/resources/ResourceContext";
import { ResourceDataNote } from "../features/resources/ResourceUI";
import type { ResourceTarget } from "../features/resources/resourceTypes";
import "../features/resources/resources.css";

const resourcePages = {
  customers: CustomersPage,
  projects: ProjectsPage,
  devices: DevicesPage,
  templates: TemplatesPage,
};
export type PrototypeResourcePage = keyof typeof resourcePages;
export function isPrototypeResourcePage(page: string): page is PrototypeResourcePage {
  return Object.prototype.hasOwnProperty.call(resourcePages, page);
}

const targetPaths: Record<ResourceTarget, string> = {
  customers: "/customers/enterprise", projects: "/projects", devices: "/devices",
  templates: "/templates", settings: "/settings", tasks: "/tasks", helmet: "/helmet-live",
  knowledge: "/model-center/knowledge", hazardGraph: "/model-center/hazard-graph",
  expertRules: "/model-center/expert-rules",
};

/** Reuse the current system's workflows; only presentation and route translation differ. */
export default function PrototypeResources({ page, focusId, navigate }: {
  page: PrototypeResourcePage;
  focusId?: string;
  navigate: (path: string, focusId?: string) => void;
}) {
  const { storageError } = useResources();
  const Page = resourcePages[page];
  return <div className={`prototype-resources prototype-resources-${page}`}>
    <Page key={`${page}:${focusId || "all"}`} focusId={focusId} recordView
      navigate={(target, id) => navigate(targetPaths[target], id)} />
    <ResourceDataNote error={storageError} />
  </div>;
}
