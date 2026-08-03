import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Building2, Phone, User, Fingerprint, MapPin, Send } from "lucide-react";
import { supabase } from "@/integrations/selfhosted/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyError, notifyValidation } from "@/lib/system-message";
import { maskCpfCnpj, maskPhone, maskCep } from "@/lib/br-masks";
import { fetchAddressByCep } from "@/lib/viacep";

const db = supabase as any;

export default function LeadLanding() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [jaExiste, setJaExiste] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    documento: "",
    contato_whatsapp: "",
    contato_email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  useEffect(() => {
    async function carregarDados() {
      if (!leadId) return;
      try {
        const { data, error } = await db
          .from("clientes")
          .select("*, empresas(*)")
          .eq("id", leadId)
          .single();

        if (error || !data) throw error;

        const leadData = data as any;
        setLead(leadData);
        setEmpresa(leadData.empresas);
        setFormData({
          nome: leadData.nome || "",
          documento: leadData.documento ? maskCpfCnpj(leadData.documento) : "",
          contato_whatsapp: maskPhone(leadData.contato_whatsapp || ""),
          contato_email: leadData.contato_email || "",
          cep: maskCep(leadData.endereco_cep || ""),
          logradouro: leadData.endereco_logradouro || "",
          numero: leadData.endereco_numero || "",
          complemento: leadData.endereco_complemento || "",
          bairro: leadData.endereco_bairro || "",
          cidade: leadData.endereco_cidade || "",
          uf: leadData.endereco_uf || "",
        });

        if (leadData.documento) {
          setJaExiste(true);
        }
      } catch (err: any) {
        console.error("Erro ao carregar lead:", err);
        // Só redireciona se for erro de "não encontrado" (404 ou erro do Postgres)
        // Se for erro de rede ou outro, exibe mensagem
        if (err?.code === "PGRST116" || err?.message?.includes("not found")) {
          navigate("/404");
        } else {
          notifyError(err, { title: "Erro ao carregar link" });
        }
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [leadId, navigate]);

  async function checkDocumento(doc: string) {
    const limpo = doc.replace(/\D/g, "");
    if (limpo.length < 11 || !lead) return;

    try {
      const { data, error } = await db
        .from("clientes")
        .select("*")
        .eq("empresa_id", lead.empresa_id)
        .eq("documento", limpo)
        .neq("id", lead.id)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setJaExiste(true);
        setFormData(prev => ({
          ...prev,
          nome: d.nome,
          documento: maskCpfCnpj(d.documento),
          contato_whatsapp: maskPhone(d.contato_whatsapp || ""),
          contato_email: d.contato_email || "",
          cep: maskCep(d.endereco_cep || ""),
          logradouro: d.endereco_logradouro || "",
          numero: d.endereco_numero || "",
          complemento: d.endereco_complemento || "",
          bairro: d.endereco_bairro || "",
          cidade: d.endereco_cidade || "",
          uf: d.endereco_uf || "",
        }));
        notifyValidation("Identificamos que você já possui cadastro conosco. Seus dados foram carregados para conferência.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCep(cep: string) {
    const value = maskCep(cep);
    setFormData(prev => ({ ...prev, cep: value }));
    if (value.length === 9) {
      try {
        const addr = await fetchAddressByCep(value);
        if (addr) {
          setFormData(prev => ({
            ...prev,
            logradouro: addr.logradouro,
            bairro: addr.bairro,
            cidade: addr.localidade,
            uf: addr.uf,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jaExiste) {
      setSucesso(true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await db
        .from("clientes")
        .update({
          nome: formData.nome,
          documento: formData.documento.replace(/\D/g, ""),
          contato_whatsapp: formData.contato_whatsapp.replace(/\D/g, ""),
          contato_email: formData.contato_email,
          endereco_cep: formData.cep.replace(/\D/g, ""),
          endereco_logradouro: formData.logradouro,
          endereco_numero: formData.numero,
          endereco_complemento: formData.complemento,
          endereco_bairro: formData.bairro,
          endereco_cidade: formData.cidade,
          endereco_uf: formData.uf,
          status: "ATIVO"
        })
        .eq("id", leadId!);

      if (error) throw error;
      setSucesso(true);
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] p-4">
        <Card className="w-full max-w-md border-emerald-500/20 bg-black/40 backdrop-blur-xl">
          <CardContent className="pt-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Tudo certo!</h2>
              <p className="text-zinc-400">
                Seus dados foram confirmados com sucesso. {jaExiste ? "Como você já é nosso cliente, qualquer alteração futura deve ser solicitada diretamente ao estúdio." : "Em breve entraremos em contato para os próximos passos."}
              </p>
            </div>
            <p className="text-sm font-medium text-amber-500">{empresa?.nome_fantasia || "JH7 Gestão de Estúdios"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent p-4 md:p-8">
      <div className="mx-auto max-w-4xl grid gap-8 md:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Building2 className="h-6 w-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">{empresa?.nome_fantasia || "JH7 Gestão de Estúdios"}</h1>
            <p className="text-sm text-zinc-500">JH7 Gestão de Estúdios Fotográficos</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
            <h3 className="font-semibold text-white">Finalize seu cadastro</h3>
            <p className="text-sm leading-relaxed text-zinc-400">
              Para prosseguirmos com seu atendimento e formalização dos orçamentos, precisamos que complete seus dados básicos. 
              Leva menos de 2 minutos.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Segurança de dados ponta a ponta
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Conformidade com LGPD
              </div>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="text-xl text-white">Seus Dados</CardTitle>
            <CardDescription className="text-zinc-500">Preencha com atenção para evitar erros no contrato.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">Nome Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <Input 
                      required
                      disabled={jaExiste}
                      value={formData.nome}
                      onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className="bg-white/[0.03] border-white/10 pl-10 focus:ring-amber-500/20" 
                      placeholder="Como no documento..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">CPF / CNPJ *</Label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <Input 
                      required
                      disabled={jaExiste}
                      value={formData.documento}
                      onChange={e => {
                        const val = maskCpfCnpj(e.target.value);
                        setFormData(prev => ({ ...prev, documento: val }));
                        if (val.length >= 14) checkDocumento(val);
                      }}
                      className="bg-white/[0.03] border-white/10 pl-10 focus:ring-amber-500/20" 
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <Input 
                      required
                      disabled={jaExiste}
                      value={formData.contato_whatsapp}
                      onChange={e => setFormData(prev => ({ ...prev, contato_whatsapp: maskPhone(e.target.value) }))}
                      className="bg-white/[0.03] border-white/10 pl-10 focus:ring-amber-500/20" 
                      placeholder="(00) 0 0000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">E-mail</Label>
                  <Input 
                    type="email"
                    disabled={jaExiste}
                    value={formData.contato_email}
                    onChange={e => setFormData(prev => ({ ...prev, contato_email: e.target.value }))}
                    className="bg-white/[0.03] border-white/10 focus:ring-amber-500/20" 
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">CEP *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-600" />
                    <Input 
                      required
                      disabled={jaExiste}
                      value={formData.cep}
                      onChange={e => handleCep(e.target.value)}
                      className="bg-white/[0.03] border-white/10 pl-10 focus:ring-amber-500/20" 
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Número *</Label>
                  <Input 
                    required
                    disabled={jaExiste}
                    value={formData.numero}
                    onChange={e => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    className="bg-white/[0.03] border-white/10 focus:ring-amber-500/20" 
                    placeholder="S/N"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400">Endereço Completo</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input disabled value={formData.logradouro} className="bg-white/[0.01] border-white/5 opacity-50" placeholder="Logradouro" />
                    <Input disabled value={formData.bairro} className="bg-white/[0.01] border-white/5 opacity-50" placeholder="Bairro" />
                    <Input disabled value={formData.cidade} className="bg-white/[0.01] border-white/5 opacity-50" placeholder="Cidade" />
                    <Input disabled value={formData.uf} className="bg-white/[0.01] border-white/5 opacity-50" placeholder="UF" />
                  </div>
                </div>
              </div>

              {jaExiste && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-500/80 leading-relaxed">
                  <strong>Aviso:</strong> Identificamos que você já possui um cadastro ativo conosco. Para sua segurança, os dados acima não podem ser alterados através deste formulário. Caso precise atualizar alguma informação, por favor, entre em contato diretamente com o estúdio fotográfico.
                </div>
              )}

              <Button 
                type="submit" 
                disabled={saving}
                className="w-full bg-amber-500 text-black hover:bg-amber-600 h-12 text-base font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {jaExiste ? "Confirmar Dados" : "Enviar Cadastro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <div className="mx-auto mt-12 max-w-4xl border-t border-white/5 pt-8 text-center text-xs text-zinc-600">
        <div className="flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-3">
          <span>© {new Date().getFullYear()} {empresa?.nome_fantasia || "JH7 Gestão de Estúdios"}. Todos os direitos reservados.</span>
          <span className="hidden opacity-30 sm:inline">•</span>
          <span className="font-mono text-[9px] tracking-tight opacity-50">Versão 2026.08.001</span>
        </div>
      </div>
    </div>
  );
}
