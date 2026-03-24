export type CardData = {
  id?: string;
  userId?: string;
  img: string;
  ava: string;
  author: string;
  handle: string;
  verified?: boolean;
  tag: string;
  title: string;
  summary: string;
  details: string;
  views: string;
  likes: string;
  dislikes?: string;
  comments: string;
  shares: string;
  createdAt?: string;
};

export const cardData: CardData[] = [
  {
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85",
    ava: "/cloud-avatar.svg",
    author: "CloudDuty",
    handle: "@CloudDuty",
    verified: true,
    tag: "Announcement",
    title: "Welcome to CloudDuty",
    summary:
      "CloudDuty is a platform for developers to showcase there projects and make a attractive portfolio to showcase to other people, they can also connect and interact with other developers !",
    details:
      "CloudDuty is a platform for developers to showcase there projects and make a attractive portfolio to showcase to other people, they can also connect and interact with other developers !",
    views: "0",
    likes: "0",
    comments: "0",
    shares: "0",
    createdAt: "2026-03-21T09:30:00Z",
  },
];
