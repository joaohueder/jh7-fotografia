import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ModalCadastroExistenteProps {
  open: boolean;
  onClose: () => void;
  empresaNome?: string;
}

export function ModalCadastroExistente({ open, onClose, empresaNome }: ModalCadastroExistenteProps) {
  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialogContent className="border-amber-500/20 bg-black/90 backdrop-blur-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl text-white">Cadastro já existe</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            Identificamos que você já possui um cadastro ativo no sistema do estúdio{" "}
            <strong className="text-amber-500">{empresaNome || "JH7 Gestão de Estúdios"}</strong>.
            <br /><br />
            Seus dados foram carregados para conferência. Caso precise de qualquer alteração cadastral, por favor, entre em contato diretamente com o estúdio.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={onClose}
            className="bg-amber-500 text-black hover:bg-amber-600 font-bold"
          >
            Entendi, está tudo certo!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
