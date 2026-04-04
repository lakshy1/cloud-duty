"use client";

import React from "react";

type MarkdownTextProps = {
  text: string;
  className?: string;
};

type InlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string };

const parseInline = (input: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith("**", i)) {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ type: "strong", value: input.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (input[i] === "*") {
      const end = input.indexOf("*", i + 1);
      if (end !== -1) {
        tokens.push({ type: "em", value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const nextStrong = input.indexOf("**", i);
    const nextEm = input.indexOf("*", i);
    const next =
      nextStrong === -1
        ? nextEm
        : nextEm === -1
          ? nextStrong
          : Math.min(nextStrong, nextEm);
    const end = next === -1 ? input.length : next;
    tokens.push({ type: "text", value: input.slice(i, end) });
    i = end;
  }
  return tokens;
};

const renderInline = (text: string, keyPrefix: string) => {
  const tokens = parseInline(text);
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (token.type === "strong") return <strong key={key}>{token.value}</strong>;
    if (token.type === "em") return <em key={key}>{token.value}</em>;
    return <React.Fragment key={key}>{token.value}</React.Fragment>;
  });
};

export function MarkdownText({ text, className }: MarkdownTextProps) {
  const lines = text.split(/\r?\n/);
  const blocks: Array<{ type: "p" | "ul"; lines: string[] }> = [];
  let currentPara: string[] = [];
  let currentList: string[] = [];

  const flushPara = () => {
    if (currentPara.length) {
      blocks.push({ type: "p", lines: currentPara });
      currentPara = [];
    }
  };

  const flushList = () => {
    if (currentList.length) {
      blocks.push({ type: "ul", lines: currentList });
      currentList = [];
    }
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushList();
      flushPara();
      return;
    }
    const isList = /^[-*]\s+/.test(line);
    if (isList) {
      flushPara();
      currentList.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList();
    currentPara.push(line);
  });

  flushList();
  flushPara();

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "ul") {
          return (
            <ul key={`ul-${blockIndex}`}>
              {block.lines.map((item, idx) => (
                <li key={`li-${blockIndex}-${idx}`}>{renderInline(item, `li-${blockIndex}-${idx}`)}</li>
              ))}
            </ul>
          );
        }
        const paragraph = block.lines.join(" ");
        return <p key={`p-${blockIndex}`}>{renderInline(paragraph, `p-${blockIndex}`)}</p>;
      })}
    </div>
  );
}
