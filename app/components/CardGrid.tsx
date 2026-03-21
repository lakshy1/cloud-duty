import type { CardData } from "../data/card-data";
import { CardItem } from "./CardItem";

type CardGridProps = {
  cards: CardData[];
  highlightQuery?: string;
  savedIds?: Set<string>;
  onToggleSave?: (postId: string) => void;
  reactions?: Map<string, "like" | "dislike">;
  onToggleReaction?: (postId: string, reaction: "like" | "dislike") => void;
  onOpenPopup: (index: number, rect: DOMRect) => void;
  onOpenReport: (index: number) => void;
};

export function CardGrid({
  cards,
  highlightQuery,
  savedIds,
  onToggleSave,
  reactions,
  onToggleReaction,
  onOpenPopup,
  onOpenReport,
}: CardGridProps) {
  return (
    <div className="masonry" id="cardGrid">
      {cards.map((card, index) => (
        <CardItem
          key={card.id ?? card.title}
          data={card}
          index={index}
          highlightQuery={highlightQuery}
          saved={card.id ? savedIds?.has(card.id) ?? false : false}
          onToggleSave={onToggleSave}
          liked={card.id ? reactions?.get(card.id) === "like" : false}
          disliked={card.id ? reactions?.get(card.id) === "dislike" : false}
          onToggleReaction={onToggleReaction}
          onOpenPopup={onOpenPopup}
          onOpenReport={onOpenReport}
        />
      ))}
    </div>
  );
}
