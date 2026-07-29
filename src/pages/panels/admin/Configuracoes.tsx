import { Building2, Gauge } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { HelpTip } from "@/components/page-help";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DadosEmpresaTab } from "@/pages/panels/admin/DadosEmpresa";
import { LimitesTab } from "@/pages/panels/admin/LimitesTab";

export default function AdminConfiguracoes() {
  usePageMeta("Configurações — JH7 Gestão Fotográfica", "Dados cadastrais da empresa.");

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Configurações</h1>
            <HelpTip text="Dados cadastrais da sua empresa e os limites do plano contratado. Digite o CEP para preencher o endereço automaticamente e clique em Salvar no fim da tela — nada é gravado antes disso." />
          </div>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Mantenha atualizados os dados cadastrais da sua empresa.
          </p>
        </header>


        <Tabs defaultValue="empresa" className="space-y-5">
          <TabsList>
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dados da empresa
            </TabsTrigger>
            <TabsTrigger value="limites" className="gap-2">
              <Gauge className="h-4 w-4" />
              Limites
            </TabsTrigger>
          </TabsList>
          <TabsContent value="empresa" className="mt-0">
            <DadosEmpresaTab />
          </TabsContent>
          <TabsContent value="limites" className="mt-0">
            <LimitesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PanelLayout>
  );
}
