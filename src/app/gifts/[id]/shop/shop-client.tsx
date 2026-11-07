"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage, ShownOption, VariantChoice } from "@/lib/chat";
import { formatDollars, isSizeGroup, matchSize } from "@/lib/gifts-format";
import { audienceFor } from "@/lib/skins";
import { MicButton } from "../../../mic-button";
import { CartView } from "./cart-view";
import { ProductSheet } from "./product-sheet";

const MAX_CART = 5;

type Props = {
  giftId: string;
  recipientName: string;
  audienceId: string;
  initialSize?: string;
  initialMessages: ChatMessage[];
  initialOptions: ShownOption[];
  initialCart: ShownOption[];
  initialTurnsLeft: number;
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2.2l2.3 11h10.6l2-8H6.3" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="16.5" cy="19.5" r="1.4" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
    </svg>
  );
}

function Bubble({ from, children }: { from: "ai" | "you"; children: React.ReactNode }) {
  return from === "ai" ? (
    <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-mist px-3.5 py-2.5">{children}</p>
  ) : (
    <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-action px-3.5 py-2.5 text-white">
      {children}
    </p>
  );
}

export function ShopClient(props: Props) {
  const { giftId, recipientName } = props;
  const audience = audienceFor(props.audienceId);
  const pathname = usePathname();
  const cartOpen = useSearchParams().has("cart");
  const [messages, setMessages] = useState(props.initialMessages);
  const [options, setOptions] = useState(props.initialOptions);
  const [cart, setCart] = useState(props.initialCart);
  const [size, setSize] = useState(props.initialSize);
  const [turnsLeft, setTurnsLeft] = useState(props.initialTurnsLeft);
  const [detail, setDetail] = useState<ShownOption | null>(null);
  const [text, setText] = useState("");
  const [asked, setAsked] = useState("");
  const [error, setError] = useState("");
  const [cartHint, setCartHint] = useState(false);
  const hinted = useRef(props.initialCart.length > 0);
  const end = useRef<HTMLDivElement>(null);

  const busy = !!asked;
  const lastReply = messages.findLast((message) => message.role === "assistant");
  const suggestions = lastReply ? lastReply.suggestions_json : audience.starters;

  useEffect(() => {
    if (!cartHint) return;
    const timer = setTimeout(() => setCartHint(false), 5000);
    return () => clearTimeout(timer);
  }, [cartHint]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, asked, error]);

  /** The same product can come up twice in a conversation, but it's one gift. */
  function inCart(option: ShownOption) {
    return cart.find((item) => item.channel3_id === option.channel3_id);
  }

  async function ask(wish: string) {
    if (!wish.trim() || busy) return;
    setAsked(wish);
    setError("");
    setText("");

    const response = await fetch(`/api/gifts/${giftId}/shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: wish }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);

    if (!response?.ok || !data) {
      setText(wish);
      setError(data?.error ?? "That didn't work. Please try again.");
    } else {
      setMessages((current) => [
        ...current,
        { role: "user", content: wish, turn: data.turn, suggestions_json: [] },
        {
          role: "assistant",
          content: data.message,
          turn: data.turn,
          suggestions_json: data.suggestions,
        },
      ]);
      setOptions((current) => [...current, ...data.options]);
      setSize(data.size);
      setTurnsLeft(data.turnsLeft);
    }
    setAsked("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(text);
  }

  async function savePick(optionId: string, choice: VariantChoice | null) {
    const response = await fetch(`/api/gifts/${giftId}/picks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId, choice }),
    }).catch(() => null);
    if (response?.ok) return true;
    const data = await response?.json().catch(() => null);
    setError(data?.error ?? "That didn't save. Please try again.");
    return false;
  }

  async function add(option: ShownOption, choice: VariantChoice) {
    setError("");
    if (cart.length >= MAX_CART) {
      setError(`Your cart holds up to ${MAX_CART} gifts.`);
      return;
    }
    const item = { ...option, variant_choice_json: choice };
    setCart((current) => [...current, item]);
    if (!(await savePick(option.id, choice))) {
      setCart((current) => current.filter(({ id }) => id !== option.id));
    } else if (!hinted.current) {
      // The first gift added shows where the cart is.
      hinted.current = true;
      setCartHint(true);
    }
  }

  /** A size the gifter already gave fills in by itself. Otherwise the details ask for it. */
  function quickAdd(option: ShownOption) {
    const sizes = option.variants_json.filter(isSizeGroup).map((group) => {
      return [group.name, size ? matchSize(group.values, size) : undefined] as const;
    });
    if (sizes.some(([, value]) => !value)) {
      setDetail(option);
      return;
    }
    void add(option, Object.fromEntries(sizes) as VariantChoice);
  }

  async function remove(option: ShownOption) {
    const item = inCart(option);
    if (!item) return;
    setError("");
    setCart((current) => current.filter(({ id }) => id !== item.id));
    if (!(await savePick(item.id, null))) setCart((current) => [...current, item]);
  }

  function row(turn: number) {
    const shown = options.filter((option) => option.turn === turn);
    if (!shown.length) return null;
    return (
      <ul className="-mx-4 flex shrink-0 snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1">
        {shown.map((option) => {
          const added = !!inCart(option);
          return (
            <li
              key={option.id}
              className="flex w-42 flex-none snap-start flex-col gap-2 rounded-2xl border border-line bg-paper p-2"
            >
              <button
                type="button"
                className="block"
                aria-label={`See details for ${option.title}`}
                onClick={() => setDetail(option)}
              >
                {/* Images come from many stores, so next/image can't list their hosts. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.image_url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-28 w-full rounded-xl bg-white object-contain"
                />
              </button>
              <div className="flex-1 px-1">
                <h2 className="line-clamp-2 font-sans text-sm font-bold leading-snug tracking-normal">
                  {option.title}
                </h2>
                <p className="mt-0.5 text-sm tabular-nums text-soft">
                  {formatDollars(option.price_cents)}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={added}
                aria-label={`${added ? "Remove" : "Add"} ${option.title}`}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold ${added ? "bg-action text-white" : "border-[1.5px] border-line text-action"}`}
                onClick={() => (added ? void remove(option) : quickAdd(option))}
              >
                {added && <Check />}
                {added ? "Added" : "Add"}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <header className="relative flex items-center gap-1 border-b border-line px-4 py-2">
        <h1 className="mr-auto min-w-0 truncate text-xl font-semibold">Gifts for {recipientName}</h1>
        <Link
          href={`/new?gift=${giftId}`}
          className="icon-button text-action"
          aria-label="Restart: change the name, age or wrap"
          title="Change the name, age or wrap"
        >
          <RestartIcon />
        </Link>
        <button
          type="button"
          className="icon-button relative text-action"
          aria-label={`Cart, ${cart.length} ${cart.length === 1 ? "gift" : "gifts"}`}
          onClick={() => {
            setCartHint(false);
            window.history.pushState(null, "", "?cart");
          }}
        >
          <CartIcon />
          {cart.length > 0 && (
            <span
              key={cart.length}
              className="reveal-in absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-action text-xs font-bold text-white"
            >
              {cart.length}
            </span>
          )}
        </button>
        {cartHint && (
          <button
            type="button"
            role="status"
            className="reveal-in absolute right-2 top-full z-20 mt-2 w-60 rounded-2xl bg-ink px-3.5 py-2.5 text-left text-sm font-medium text-white shadow-lg"
            onClick={() => setCartHint(false)}
          >
            <span className="absolute -top-1.5 right-6 size-3 rotate-45 bg-ink" aria-hidden="true" />
            Your gifts are saved. Tap the cart when you&apos;re ready to check out.
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 py-4">
        <Bubble from="ai">
          Tell me a little bit more about {recipientName}, like what {audience.likes}.
        </Bubble>

        {messages.map((message, index) =>
          message.role === "user" ? (
            <Bubble key={index} from="you">
              {message.content}
            </Bubble>
          ) : (
            <div key={index} className="contents">
              <Bubble from="ai">{message.content}</Bubble>
              {row(message.turn)}
            </div>
          ),
        )}

        {busy && <Bubble from="you">{asked}</Bubble>}
        {busy && (
          <p className="self-start rounded-2xl rounded-bl-md bg-mist px-4 py-3" role="status">
            <span className="sr-only">Looking for gifts</span>
            <span className="typing" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </p>
        )}

        {!busy &&
          turnsLeft > 0 &&
          suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="max-w-[85%] self-end rounded-2xl rounded-br-md border-[1.5px] border-action px-3.5 py-2 text-left font-medium text-action"
              onClick={() => void ask(suggestion)}
            >
              {suggestion}
            </button>
          ))}

        {error && (
          <p className="text-sm text-alert" role="alert">
            {error}
          </p>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-line px-4 pb-4 pt-2.5">
        {turnsLeft > 0 ? (
          <form onSubmit={submit} className="flex h-12 items-center rounded-full bg-mist pl-4 pr-0.5">
            <input
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              placeholder="Message"
              aria-label="Message"
            />
            {text.trim() ? (
              <button
                type="submit"
                className="icon-button bg-action text-white disabled:opacity-60"
                disabled={busy}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
              </button>
            ) : (
              <MicButton onText={(spoken) => void ask(spoken)} />
            )}
          </form>
        ) : (
          <p className="py-2 text-center text-sm text-soft">
            That&apos;s all the searches for this gift. Your cart is ready when you are.
          </p>
        )}
      </div>

      {detail && (
        <ProductSheet
          key={detail.id}
          option={detail}
          recipientName={recipientName}
          size={size}
          added={!!inCart(detail)}
          onAdd={(choice) => void add(detail, choice)}
          onRemove={() => void remove(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {cartOpen && (
        <CartView
          giftId={giftId}
          recipientName={recipientName}
          cart={cart}
          error={error}
          onRemove={(option) => void remove(option)}
          onBack={() => window.history.replaceState(null, "", pathname)}
        />
      )}
    </>
  );
}
