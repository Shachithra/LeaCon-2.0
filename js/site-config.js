/* ==========================================================================
   LeaCon II — Site configuration (single source of truth)
   --------------------------------------------------------------------------
   Change these two values here and every page follows:
     · hero status strip + deadline
     · every "Apply" button (desktop nav, mobile menu, hero, CTA bands,
       role pages)
     · the application page hero
     · the form itself (open vs. closed state panel)

   applicationStatus: "open" | "closed" | "upcoming"
     open      → form enabled, buttons say "Apply"
     closed    → form replaced by the closed panel, buttons say
                 "Applications closed"
     upcoming  → form replaced by the closed panel, buttons say
                 "Applications open soon"

   applicationDeadline: the exact string shown on every deadline slot.
     Leave "" to hide the deadline everywhere.
   ========================================================================== */

window.LC_SITE = {
  applicationStatus: "open",
  applicationDeadline: "10 October 2026, 11.59 pm"
};
