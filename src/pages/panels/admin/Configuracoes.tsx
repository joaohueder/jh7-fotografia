import { Building2 } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DadosEmpresaTab } from "@/pages/panels/admin/DadosEmpresa";

export default function AdminConfiguracoes() {
  usePageMeta("Configurações — JH7 Gestão Fotográfica", "Dados cadastrais da empresa.");

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-1">
          <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Configurações</h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Mantenha atualizados os dados cadastrais da sua empresa.
          </p>
        </header>

        <PageHelp
          title="Como usar as Configurações"
          steps={[
            "Preencha ou corrija os dados da sua empresa nos campos abaixo.",
            "Digite o CEP e o endereço é preenchido automaticamente — confira e ajuste o número.",
            "Clique em Salvar no fim da tela para guardar as alterações.",
          ]}
        >
          Estes dados aparecem nos seus documentos e comunicações. Você pode voltar aqui e alterar
          quando quiser; nada é enviado antes de você clicar em Salvar.
        </PageHelp>


        <Tabs defaultValue="empresa" className="space-y-5">
          <TabsList>
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dados da empresa
            </TabsTrigger>
          </TabsList>
          <TabsContent value="empresa" className="mt-0">
            <DadosEmpresaTab />
          </TabsContent>
        </Tabs>
      </div>
    </PanelLayout>
  );
}
