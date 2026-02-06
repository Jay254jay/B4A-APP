import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeonButton } from "./NeonButton";
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/use-transactions";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers } from "@/hooks/use-users";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "cash" | "mpesa" | "withdrawal";
  currentUser: any;
  editData?: any;
}

export function TransactionModal({ isOpen, onClose, type, currentUser, editData }: TransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [groomedBy, setGroomedBy] = useState("");
  const [servedBy, setServedBy] = useState(currentUser.name || "");
  const [description, setDescription] = useState("");
  const [mpesaRef, setMpesaRef] = useState("");
  const [recipient, setRecipient] = useState(""); 
  const [selectedType, setSelectedType] = useState<"cash" | "mpesa" | "withdrawal">(type);
  
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const { toast } = useToast();
  const { data: users } = useUsers();

  useEffect(() => {
    if (editData) {
      setAmount(editData.amount.toString());
      setClientName(editData.clientName || "");
      setGroomedBy(editData.groomedBy || "");
      setServedBy(editData.servedBy || "");
      setDescription(editData.description || "");
      setMpesaRef(editData.mpesaRef || "");
      setRecipient(editData.recipient || "");
      setSelectedType(editData.type || type);
    } else {
      // Reset logic or default values for new entry
      setAmount("");
      setClientName("");
      setGroomedBy("");
      setServedBy(currentUser.name || "");
      setDescription("");
      setMpesaRef("");
      setRecipient("");
      setSelectedType(type);
    }
  }, [editData, isOpen, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount))) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    if (!servedBy) {
      toast({ title: "Served By is mandatory", variant: "destructive" });
      return;
    }

    if (!groomedBy) {
      toast({ title: "Groomed By is mandatory", variant: "destructive" });
      return;
    }

    if (selectedType === 'mpesa' && !recipient) {
      toast({ title: "Who received the Mpesa?", variant: "destructive" });
      return;
    }

    const payload = {
      userId: currentUser.id,
      type: selectedType,
      amount: Number(amount),
      clientName,
      groomedBy,
      servedBy,
      description,
      mpesaRef: selectedType === 'mpesa' ? mpesaRef : undefined,
      recipient: (selectedType === 'mpesa' || selectedType === 'withdrawal') ? (recipient || currentUser.name) : undefined,
    };

    if (editData) {
      updateTx.mutate({ id: editData.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Transaction updated!", className: "bg-primary text-primary-foreground" });
          onClose();
        },
        onError: () => {
          toast({ title: "Failed to update transaction", variant: "destructive" });
        }
      });
    } else {
      createTx.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Transaction logged!", className: "bg-primary text-primary-foreground" });
          setAmount("");
          setClientName("");
          setGroomedBy("");
          setDescription("");
          setMpesaRef("");
          setRecipient("");
          onClose();
        },
        onError: () => {
          toast({ title: "Failed to log transaction", variant: "destructive" });
        }
      });
    }
  };

  const getTitle = () => {
    const action = editData ? "Edit" : "New";
    switch(selectedType) {
      case 'cash': return <span className="text-primary text-glow-primary">{action} Cash Payment</span>;
      case 'mpesa': return <span className="text-secondary text-glow-secondary">{action} Mpesa Payment</span>;
      case 'withdrawal': return <span className="text-accent text-glow-accent">{action} Withdrawal</span>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-center uppercase tracking-widest">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Category</Label>
            <Select value={selectedType} onValueChange={(v: "cash" | "mpesa" | "withdrawal") => setSelectedType(v)}>
              <SelectTrigger className="bg-black/30 border-white/10 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mpesa">Mpesa</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Amount (KES)</Label>
            <Input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black/30 border-white/10 text-2xl font-display text-center h-16 focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Client Name (Optional)</Label>
            <Input 
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Client Name"
              className="bg-black/30 border-white/10 focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-glow-primary uppercase text-xs tracking-wider">Served By (Mandatory)</Label>
            <Select value={servedBy} onValueChange={setServedBy}>
              <SelectTrigger className="bg-black/30 border-white/10 border-primary/30 focus:ring-2 focus:ring-primary/50 text-white">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {users?.filter(u => u.role === "staff").map(user => (
                  <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-glow-primary uppercase text-xs tracking-wider">Groomed By (Mandatory)</Label>
            <Select value={groomedBy} onValueChange={setGroomedBy}>
              <SelectTrigger className="bg-black/30 border-white/10 border-primary/30 focus:ring-2 focus:ring-primary/50 text-white">
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {users?.filter(u => u.role === "staff").map(user => (
                  <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(selectedType === 'mpesa' || selectedType === 'withdrawal') && (
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">
                {selectedType === 'mpesa' ? "Who Received Mpesa?" : "Who Handled Withdrawal?"}
              </Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="bg-black/30 border-white/10 focus:ring-2 focus:ring-secondary/50 text-white">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {users?.filter(u => u.role === "staff").map(user => (
                    <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedType === 'mpesa' && (
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Mpesa Ref (Optional)</Label>
              <Input 
                value={mpesaRef}
                onChange={e => setMpesaRef(e.target.value)}
                placeholder="QH..."
                className="bg-black/30 border-white/10 focus:ring-2 focus:ring-secondary/50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground uppercase text-xs tracking-wider">Service Description</Label>
            <Input 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Fade + Beard"
              className="bg-black/30 border-white/10"
            />
          </div>

          <NeonButton 
            type="submit" 
            className="w-full h-14 text-lg" 
            variant={selectedType === 'cash' ? 'primary' : selectedType === 'mpesa' ? 'secondary' : 'accent'}
            disabled={createTx.isPending || updateTx.isPending}
          >
            {createTx.isPending || updateTx.isPending ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
          </NeonButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
