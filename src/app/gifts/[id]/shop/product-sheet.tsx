"use client";

import { useEffect, useRef, useState } from "react";
import type { ShownOption, VariantChoice } from "@/lib/chat";
import { formatDollars, isSizeGroup, matchSize, photosOf, variantSummary } from "@/lib/gifts-format";
import { MoreText } from "../../../more-text";
import { Gallery } from "../../../gallery";

type Props = {
  option: ShownOption;
  recipientName: string;
  size?: string;
  added: boolean;
  onAdd: (choice: VariantChoice) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function ProductSheet({ option, recipientName, size, added, onAdd, onRemove, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sizes = option.variants_json.filter(isSizeGroup);
  const summary = variantSummary(option.variants_json);
  const [choice, setChoice] = useState<VariantChoice>(() =>
    Object.fromEntries(
      sizes.flatMap((group) => {
        const match = size && matchSize(group.values, size);
        return match ? [[group.name, match]] : [];
      }),
    ),
  );
  const ready = sizes.every((group) => choice[group.name]);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={option.title}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-3xl bg-paper text-ink backdrop:bg-black/50 sm:mx-auto sm:max-w-lg"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }}
    >
      <div className="relative flex flex-col gap-3 px-4 pt-4">
        <button
          type="button"
          className="icon-button absolute right-3 top-3 z-20 bg-mist"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="-mx-4 -mt-4">
          <Gallery images={photosOf(option)} height="h-[40dvh]" />
        </div>
        <div className="flex justify-between gap-3">
          <h2 className="text-xl font-semibold">{option.title}</h2>
          <span className="text-lg font-bold tabular-nums">{formatDollars(option.price_cents)}</span>
        </div>
        {option.age_label && (
          <p className="w-fit rounded-full bg-mist px-3 py-1 text-sm font-semibold">{option.age_label}</p>
        )}
        <p className="font-medium">{option.reason}</p>
        {option.description && <MoreText text={option.description} className="text-sm text-soft" />}
        <p className="text-sm text-soft">Sold by {option.merchant}</p>
        {summary && (
          <p className="text-sm font-medium text-accent">
            {summary}. {recipientName} chooses.
          </p>
        )}
        {!added &&
          sizes.map((group) => (
            <label key={group.name} className="flex flex-col gap-1 text-sm font-medium">
              {group.name}
              <select
                className="field"
                value={choice[group.name] ?? ""}
                onChange={(event) =>
                  setChoice((current) => ({ ...current, [group.name]: event.target.value }))
                }
              >
                <option value="" disabled>
                  Choose a size
                </option>
                {group.values.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper px-4 pb-4 pt-3">
          <button
            type="button"
            className="button w-full"
            disabled={!added && !ready}
            onClick={() => {
              if (added) onRemove();
              else onAdd(choice);
              dialog.current?.close();
            }}
          >
            {added ? "Remove from cart" : "Add to cart"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
