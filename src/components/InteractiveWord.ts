import { detectUserLocale, pickLocalizedArray, pickLocalizedText } from "../core/i18n";
import { renderFuriganaToHtml } from "../core/furigana";
import { createDefaultTokenizer, JapaneseTokenizer } from "../core/tokenizer";
import { JapaneseStudyDB } from "../db/schema";
import { LocaleCode } from "../types/models";

export interface InteractiveWordOptions {
  db: JapaneseStudyDB;
  container: HTMLElement;
  text: string;
  locale?: LocaleCode;
  tokenizer?: JapaneseTokenizer;
  longPressMs?: number;
}

interface PopupData {
  reading?: string;
  translation: string;
}

export class InteractiveWord {
  private readonly db: JapaneseStudyDB;
  private readonly container: HTMLElement;
  private readonly text: string;
  private readonly locale: LocaleCode;
  private readonly longPressMs: number;
  private tokenizer: JapaneseTokenizer | null = null;
  private tooltip: HTMLDivElement;

  constructor(options: InteractiveWordOptions) {
    this.db = options.db;
    this.container = options.container;
    this.text = options.text;
    this.locale = options.locale ?? detectUserLocale();
    this.longPressMs = options.longPressMs ?? 450;
    this.tokenizer = options.tokenizer ?? null;

    this.tooltip = document.createElement("div");
    this.tooltip.className = "interactive-word-tooltip";
    this.tooltip.style.position = "fixed";
    this.tooltip.style.display = "none";
    this.tooltip.style.zIndex = "1000";
    this.tooltip.style.padding = "8px 10px";
    this.tooltip.style.borderRadius = "8px";
    this.tooltip.style.fontSize = "13px";
    this.tooltip.style.background = "rgba(22, 28, 36, 0.95)";
    this.tooltip.style.color = "#fff";
    this.tooltip.style.maxWidth = "280px";
    document.body.appendChild(this.tooltip);
  }

  async render(): Promise<void> {
    if (!this.tokenizer) {
      this.tokenizer = await createDefaultTokenizer();
    }

    const tokens = this.tokenizer.tokenize(this.text);
    this.container.innerHTML = "";

    for (const token of tokens) {
      const span = document.createElement("span");
      span.className = "interactive-word-token";
      span.innerHTML = renderFuriganaToHtml(token);
      span.style.cursor = "pointer";
      span.style.padding = "0 1px";

      this.attachDesktopHover(span, token);
      this.attachMobileTouch(span, token);

      this.container.appendChild(span);
    }
  }

  destroy(): void {
    this.tooltip.remove();
  }

  private attachDesktopHover(el: HTMLElement, token: string): void {
    el.addEventListener("mouseenter", async (ev) => {
      if (this.isTouchDevice()) {
        return;
      }

      const data = await this.lookup(token);
      this.showTooltip(ev.clientX, ev.clientY, data);
    });

    el.addEventListener("mouseleave", () => this.hideTooltip());
  }

  private attachMobileTouch(el: HTMLElement, token: string): void {
    let timerId: number | null = null;

    el.addEventListener("touchstart", () => {
      timerId = window.setTimeout(async () => {
        const rect = el.getBoundingClientRect();
        const data = await this.lookup(token);
        this.showTooltip(rect.left + rect.width / 2, rect.top, data);
      }, this.longPressMs);
    });

    const clearTimer = (): void => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    el.addEventListener("touchend", clearTimer);
    el.addEventListener("touchcancel", clearTimer);

    el.addEventListener("click", async (event) => {
      if (!this.isTouchDevice()) {
        return;
      }

      event.preventDefault();
      if (this.tooltip.style.display === "block") {
        this.hideTooltip();
      } else {
        const rect = el.getBoundingClientRect();
        const data = await this.lookup(token);
        this.showTooltip(rect.left + rect.width / 2, rect.top, data);
      }
    });
  }

  private showTooltip(x: number, y: number, data: PopupData): void {
    this.tooltip.innerHTML = data.reading
      ? `<strong>${data.reading}</strong><br>${data.translation}`
      : data.translation;

    this.tooltip.style.left = `${Math.max(12, x - 100)}px`;
    this.tooltip.style.top = `${Math.max(12, y - 52)}px`;
    this.tooltip.style.display = "block";
  }

  private hideTooltip(): void {
    this.tooltip.style.display = "none";
  }

  private async lookup(token: string): Promise<PopupData> {
    const normalized = token.trim();
    if (!normalized) {
      return { translation: "" };
    }

    const word = await this.db.words.where("scrittura").equals(normalized).first();
    if (word) {
      return {
        reading: word.lettura,
        translation: pickLocalizedArray(word.significato, this.locale).join(" / ")
      };
    }

    const grammar = await this.db.grammar.where("struttura").equals(normalized).first();
    if (grammar) {
      return {
        translation: pickLocalizedText(grammar.spiegazione, this.locale)
      };
    }

    return {
      translation: normalized
    };
  }

  private isTouchDevice(): boolean {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }
}
