'use client';

import { useActionState, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { updateCase, deleteCase } from '@/app/actions/edit-case';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { ItemThumb } from '@/components/ItemThumb';
import { getRarityTier, RARITY_INFO } from '@/lib/rarity';

type InitialItem = {
  id: string;
  name: string;
  weight: number;
  removed: boolean;
  description: string | null;
  imageUrl: string;
};

type EditableItem = {
  key: string;
  id: string | null;
  name: string;
  weight: number;
  removed: boolean;
  description: string | null;
  imageUrl: string;
  file: File | null;
};

const inputClass =
  'h-11 rounded-md border border-line-strong bg-surface-card px-3 text-body outline-none focus:border-gold';

function probabilities(items: EditableItem[]): number[] {
  const active = items.filter((i) => !i.removed);
  const total = active.reduce((sum, i) => sum + i.weight, 0);
  const byKey = new Map(active.map((i) => [i.key, total > 0 ? i.weight / total : 0]));
  return items.map((i) => byKey.get(i.key) ?? 0);
}

export function CaseEditForm({
  caseId,
  title: initialTitle,
  price: initialPrice,
  openCount,
  earned,
  createdAt,
  initialItems,
  coverImageUrl,
}: {
  caseId: string;
  title: string;
  price: number;
  openCount: number;
  earned: number;
  createdAt: string;
  initialItems: InitialItem[];
  coverImageUrl: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [price, setPrice] = useState(initialPrice);
  const [items, setItems] = useState<EditableItem[]>(
    initialItems.map((item) => ({ ...item, key: item.id, file: null }))
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(coverImageUrl);
  const [state, formAction, isPending] = useActionState(updateCase.bind(null, caseId), null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const odds = useMemo(() => probabilities(items), [items]);
  const created = new Date(createdAt).toLocaleDateString('ru-RU');

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const toggleRemoved = (key: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, removed: !item.removed } : item))
    );
  };

  const removeNewItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: null,
        name: '',
        weight: 1,
        removed: false,
        description: null,
        imageUrl: '',
        file: null,
      },
    ]);
  };

  const handleFileChange = (key: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateItem(key, { file, imageUrl: URL.createObjectURL(file) });
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('title', title);
    fd.set('price', String(price));

    const newFiles: File[] = [];
    const payload = items.map((item) => {
      if (item.id) {
        return {
          id: item.id,
          name: item.name,
          weight: item.weight,
          removed: item.removed,
          description: item.description,
          imageIndex: null,
        };
      }
      const imageIndex = item.file ? newFiles.push(item.file) - 1 : null;
      return {
        id: null,
        name: item.name,
        weight: item.weight,
        removed: false,
        description: item.description,
        imageIndex,
      };
    });
    fd.set('items', JSON.stringify(payload));
    newFiles.forEach((file) => fd.append('newItemImage', file));
    if (coverFile) fd.set('coverImage', coverFile);

    formAction(fd);
  };

  const handleDelete = async () => {
    if (!confirm('Удалить кейс? Ссылка перестанет работать. Выпавшие предметы останутся у игроков.')) return;
    const result = await deleteCase(caseId);
    if (result?.error) setDeleteError(result.error);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line-soft pb-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-caps uppercase text-text-muted">
            /case/{caseId.slice(0, 8)} · создан {created}
          </span>
          <h1 className="font-display text-display-lg uppercase">Изменить кейс</h1>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">круток</span>
            <span className="font-mono text-heading font-bold">{openCount}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">заработано</span>
            <span className="flex items-center gap-2 font-mono text-heading font-bold">
              <CurrencyIcon size={15} /> {earned}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
        <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-45 rounded-[2px] bg-gold" />
        <span className="text-body text-text-secondary">
          Кейс уже крутили {openCount} раз. Правки применяются только к будущим круткам — предметы,
          которые уже выпали, остаются в инвентарях игроков.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-caps uppercase text-text-muted">название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-caps uppercase text-text-muted">цена крутки</span>
            <div className="flex items-center gap-2">
              <CurrencyIcon size={13} />
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
                className={`${inputClass} w-full font-mono font-bold`}
              />
            </div>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-caps uppercase text-text-muted">обложка кейса</span>
          <label className="relative flex h-[110px] w-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-inset text-center font-mono text-[10px] text-text-dim hover:border-gold hover:text-gold">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              'загрузить обложку'
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-caps uppercase text-text-muted">
              предметы · {items.filter((i) => !i.removed).length}
            </span>
            <span className="font-mono text-caps text-text-secondary">шансы пересчитываются на лету</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item, i) => {
              const tier = getRarityTier(odds[i] || 0);
              const info = RARITY_INFO[tier];
              const original = initialItems.find((o) => o.id === item.id);
              const wasRemoved = original?.removed ?? false;

              return (
                <div
                  key={item.key}
                  className={`flex flex-col gap-3 rounded-lg border p-3 sm:grid sm:grid-cols-[84px_1fr_120px_150px_36px] sm:items-center ${
                    item.removed ? 'border-danger/30 bg-danger/5 opacity-75' : 'border-line bg-surface-card'
                  }`}
                >
                  <ItemThumb imageUrl={item.imageUrl} size="xs">
                    {!item.imageUrl && (
                      <label className="absolute inset-0 flex cursor-pointer items-center justify-center text-center font-mono text-[9px] leading-tight text-text-dim hover:text-gold">
                        фото
                        <input
                          type="file"
                          accept="image/*"
                          required={item.id === null}
                          onChange={handleFileChange(item.key)}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </label>
                    )}
                  </ItemThumb>

                  {item.removed ? (
                    <span className="text-body text-text-muted line-through">{item.name}</span>
                  ) : (
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.key, { name: e.target.value })}
                      placeholder="Название предмета"
                      required
                      className={inputClass}
                    />
                  )}

                  {!item.removed && (
                    <textarea
                      value={item.description ?? ''}
                      onChange={(e) => updateItem(item.key, { description: e.target.value || null })}
                      placeholder="Описание (необязательно)"
                      rows={1}
                      className={`${inputClass} h-auto resize-none py-2.5 sm:col-span-full`}
                    />
                  )}

                  {item.removed ? (
                    <span className="font-mono text-caps text-danger">удалён</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caps text-text-muted">вес</span>
                      <input
                        type="number"
                        min={1}
                        value={item.weight}
                        onChange={(e) => updateItem(item.key, { weight: Number(e.target.value) })}
                        required
                        className={`${inputClass} w-full font-mono`}
                      />
                    </div>
                  )}

                  {item.removed ? (
                    <span className="font-mono text-caps text-text-dim">больше не выпадет</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-mono text-caps" style={{ color: info.colorVar }}>
                        <span>{info.name}</span>
                        <span className="text-text-primary">{((odds[i] || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-[5px] overflow-hidden rounded-full bg-inset">
                        <div
                          className="h-full"
                          style={{ width: `${(odds[i] || 0) * 100}%`, background: info.colorVar }}
                        />
                      </div>
                    </div>
                  )}

                  {item.id === null ? (
                    <button
                      type="button"
                      onClick={() => removeNewItem(item.key)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-text-muted hover:border-danger hover:text-danger"
                    >
                      ×
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleRemoved(item.key)}
                      title={item.removed ? 'вернуть' : 'удалить'}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg ${
                        item.removed
                          ? 'border-line-strong text-text-secondary hover:border-gold hover:text-gold'
                          : 'border-line text-text-muted hover:border-danger hover:text-danger'
                      }`}
                    >
                      {item.removed ? '↺' : '×'}
                    </button>
                  )}
                  {wasRemoved && !item.removed && (
                    <span className="col-span-full font-mono text-[10px] text-gold sm:col-span-1 sm:col-start-4">
                      будет восстановлен
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex h-12 items-center justify-center rounded-lg border border-dashed border-line-strong text-body text-text-secondary hover:border-gold hover:text-gold"
          >
            + добавить предмет
          </button>
        </div>

        {state?.error && (
          <p role="alert" className="font-mono text-caps text-danger">
            {state.error}
          </p>
        )}

        <div className="flex justify-end border-t border-line-soft pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="relative flex h-12 items-center overflow-hidden rounded-md bg-gold px-8 font-display text-label uppercase text-bg hover:bg-gold-hover disabled:cursor-wait"
          >
            {isPending && (
              <span className="absolute inset-0 w-[45%] animate-[lk-sheen_1.1s_linear_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            )}
            <span className="relative">{isPending ? 'Сохраняем…' : 'Сохранить'}</span>
          </button>
        </div>
      </form>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-line-soft pt-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-body font-semibold text-danger">Удалить кейс</span>
          <span className="font-mono text-caps text-text-muted">
            ссылка перестанет работать, выпавшие предметы останутся у игроков
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="flex h-11 items-center rounded-md border border-danger/40 px-4 font-mono text-caps uppercase text-danger hover:border-danger hover:bg-danger/10"
        >
          удалить
        </button>
        {deleteError && (
          <p role="alert" className="font-mono text-caps text-danger">
            {deleteError}
          </p>
        )}
      </div>
    </>
  );
}
