These investor-only rendering components preserve production commit `9ebf2c7`.
The owner explicitly requires investor pages, including the bottom
bar, to remain pixel-identical to that version. Import paths are changed.
QuarterSlider and Sparkline retain their original markup and styles; their
selected markers paint immediately while portfolio updates use a transition,
to meet the owner's 100 ms interaction gate.
The merged company/value surfaces continue using the shared components outside
this directory. `app/unified.css` excludes `.legacy-investor` pages.

Search.tsx now re-exports the site-wide modal. Its markup and computed typography
preserve the original investor palette; company identity and ranking are shared.
