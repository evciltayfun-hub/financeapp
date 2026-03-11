"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MonthlyGoal } from "@/lib/types";
import { formatCurrency, MONTH_NAMES } from "@/lib/utils";
import { PlusCircle, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function GoalsPage() {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    incomeTarget: "",
    savingTarget: "",
    actualIncome: "",
    actualExpense: "",
    note: "",
  });

  const loadGoals = useCallback(async () => {
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadGoals();
      setLoading(false);
    })();
  }, [loadGoals]);

  const saveGoal = async () => {
    if (!form.year || !form.month) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Hedef kaydedildi");
      setShowForm(false);
      setForm({ year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString(), incomeTarget: "", savingTarget: "", actualIncome: "", actualExpense: "", note: "" });
      await loadGoals();
    } else {
      toast.error("Kaydedilemedi");
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Bu hedefi silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    toast.success("Silindi");
    await loadGoals();
  };

  const totalSaved = goals.reduce((s, g) => s + Math.max(0, g.actualIncome - g.actualExpense), 0);
  const totalTargetSaving = goals.reduce((s, g) => s + g.savingTarget, 0);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aylık Hedefler</h1>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <PlusCircle size={14} />
          Ay Ekle
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Toplam Biriktirilen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Toplam Hedef</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalTargetSaving)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Hedef Gerçekleşme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalTargetSaving > 0 ? `%${((totalSaved / totalTargetSaving) * 100).toFixed(0)}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const saved = goal.actualIncome - goal.actualExpense;
          const savingProgress = goal.savingTarget > 0 ? (saved / goal.savingTarget) * 100 : 0;
          const incomeProgress = goal.incomeTarget > 0 ? (goal.actualIncome / goal.incomeTarget) * 100 : 0;

          return (
            <Card key={goal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">
                      {MONTH_NAMES[goal.month - 1]} {goal.year}
                    </h3>
                    <Badge
                      variant="outline"
                      className={saved >= goal.savingTarget ? "text-green-600 border-green-200 bg-green-50" : "text-muted-foreground"}
                    >
                      {saved >= goal.savingTarget ? "✓ Hedef Tuttu" : "Devam Ediyor"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGoal(goal.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gelir Hedefi</p>
                    <p className="font-medium">{formatCurrency(goal.incomeTarget)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp size={10} className="text-green-500" /> Gerçek Gelir
                    </p>
                    <p className="font-medium text-green-600">{formatCurrency(goal.actualIncome)}</p>
                    {goal.incomeTarget > 0 && (
                      <p className="text-xs text-muted-foreground">%{incomeProgress.toFixed(0)} gerçekleşti</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingDown size={10} className="text-red-500" /> Gerçek Gider
                    </p>
                    <p className="font-medium text-red-600">{formatCurrency(goal.actualExpense)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Yatırım Hedefi / Birikim</p>
                    <p className={`font-medium ${saved >= goal.savingTarget ? "text-green-600" : ""}`}>
                      {formatCurrency(saved)} / {formatCurrency(goal.savingTarget)}
                    </p>
                    {goal.savingTarget > 0 && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${savingProgress >= 100 ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, savingProgress)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {goal.note && (
                  <p className="mt-3 text-sm text-muted-foreground italic">"{goal.note}"</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Target className="mx-auto mb-4 opacity-20" size={48} />
            <p className="font-medium">Henüz hedef eklenmedi</p>
            <p className="text-sm">Aylık gelir, gider ve yatırım hedeflerini buraya ekle</p>
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aylık Hedef Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Yıl</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ay</Label>
                <Select value={form.month} onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gelir Hedefi (TL)</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={form.incomeTarget}
                  onChange={(e) => setForm((f) => ({ ...f, incomeTarget: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yatırım Hedefi (TL)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={form.savingTarget}
                  onChange={(e) => setForm((f) => ({ ...f, savingTarget: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gerçek Gelir (TL)</Label>
                <Input
                  type="number"
                  placeholder="48000"
                  value={form.actualIncome}
                  onChange={(e) => setForm((f) => ({ ...f, actualIncome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gerçek Gider (TL)</Label>
                <Input
                  type="number"
                  placeholder="35000"
                  value={form.actualExpense}
                  onChange={(e) => setForm((f) => ({ ...f, actualExpense: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Not (opsiyonel)</Label>
              <Input
                placeholder="Bu ay için notlar..."
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
            <Button onClick={saveGoal}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Target({ className, size }: { className?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
