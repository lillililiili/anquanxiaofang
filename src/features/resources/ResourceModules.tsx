import CustomersPage from "./CustomersPage";
import ProjectsPage from "./ProjectsPage";
import DevicesPage from "./DevicesPage";
import TemplatesPage from "./TemplatesPage";
import SettingsPage from "./SettingsPage";
import { useResources } from "./ResourceContext";
import { ResourceDataNote } from "./ResourceUI";
import type { ResourcePageProps } from "./resourceTypes";

export default function ResourceModules({ page, ...props }: ResourcePageProps & { page: string }) {
  const { storageError } = useResources();
  const pages: Record<string, typeof CustomersPage> = { customers: CustomersPage, projects: ProjectsPage, devices: DevicesPage, templates: TemplatesPage, settings: SettingsPage };
  const Page = pages[page];
  return <>{Page && <Page {...props} />}{page !== "settings" && <ResourceDataNote error={storageError} />}</>;
}
