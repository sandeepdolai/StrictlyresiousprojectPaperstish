export interface ProjectTag {
  title: string;
  url: string | null;
}

export interface Project {
  title: string;
  slug: string;
  description: string;
  link: string | null;
  tags: ProjectTag[];
  awards: number;
  /** aspect ratio width/height of the carousel card */
  aspect: number;
  /** media for the project sheet, first item is the carousel texture */
  media: string[];
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Empty until new curated starter templates are ready to publish. */
export const FEATURED: Project[] = [];

/** Curated starter websites shown in the website-template browser. */
export const WEBSITE_TEMPLATES: Project[] = [
  {
    title: "Love Heart",
    slug: "love-heart",
    description:
      "A glowing heart forms from “I love you” in 20 languages, then keeps shimmering.",
    link: null,
    tags: [
      { title: "Animation", url: null },
      { title: "Romantic", url: null },
    ],
    awards: 0,
    aspect: 1,
    media: [BASE_PATH + "/templates/love-heart-preview.svg"],
  },
];

export interface IndexItem {
  title: string;
  href: string;
  external: boolean;
}

export const FULL_INDEX: IndexItem[] = FEATURED.map((project) => ({
  title: project.title,
  href: `${BASE_PATH}/projects/${project.slug}`,
  external: false,
}));

export const SITE = {
  name: "Paper Stish",
  role: "personal website maker",
  summary:
    "Create a personal design for someone special, then publish it as a shareable website with Paper Stish.",
  about:
    "Start with an idea, make the design yours, and send one simple link. Published websites open in a browser without requiring visitors to sign in.",
  awards: "Create something personal. Make it yours. Share it with a link.",
  email: "sandeepdolai.info@gmail.com",
  profiles: [] as { title: string; url: string }[],
};
