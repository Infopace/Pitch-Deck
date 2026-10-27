import { apiClient } from "@/services/api/client";

/** One type-specific intake field, as declared by the backend registry. */
export interface BriefField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder: string;
  help: string;
  required: boolean;
}

/** One shared intake field a deck type uses, by its backend name. */
export interface IntakeField {
  name: string;
  relevance: "R" | "C" | "O";
  /** Funding stages at which this field is hidden (revenue the company can't have yet). */
  hiddenAtStages: string[];
}

export interface DeckTypeOption {
  key: string;
  label: string;
  description: string;
  eyebrow: string;
  slideCount: number;
  research: "full" | "light" | "none";
  supportsStages: boolean;
  /** Shared form fields this type needs when there is no website to crawl. */
  manualRequired: string[];
  /** Which shared form fields this type asks for; the form hides the rest. */
  intakeFields: IntakeField[];
  briefFields: BriefField[];
}

/**
 * The deck-type catalogue, served from the backend registry.
 *
 * The new-project form renders its picker and its per-type fields from this
 * rather than a local copy, so the form cannot ask for fields the prompt does
 * not read (or miss ones it requires).
 */
export const deckTypesApi = {
  list: async (): Promise<DeckTypeOption[]> => {
    const { data } = await apiClient.get("/deck-types");
    return data.data;
  },
};
