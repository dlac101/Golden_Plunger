# Cleanest Cabin Competition: Scoring System

## The competition
- 21 cabins, three age groups (Alpha, Beta, Gamma), gender-separated.
- Inspected daily, Tuesday through Friday.
- Three awards per day: cleanest cabin in **Alpha**, **Beta**, and **Gamma**.

## Cabins (21)
| Codes | Age group | Gender | Count |
|-------|-----------|--------|-------|
| AG1 - AG5 | Alpha | Girls | 5 |
| AB1 - AB5 | Alpha | Boys | 5 |
| BG1 - BG4 | Beta | Girls | 4 |
| BB1 - BB2 | Beta | Boys | 2 |
| GG1 - GG2 | Gamma | Girls | 2 |
| GB1 - GB3 | Gamma | Boys | 3 |

Cabin code = [age][gender][number]. First letter A/B/G = Alpha/Beta/Gamma. Second letter G/B = Girls/Boys.

Award pools: Alpha = AG + AB (10 cabins), Beta = BG + BB (6), Gamma = GG + GB (5).

## Scoring: 5 categories, 0/1/2 each, summing to Cleanliness
Score each category 0, 1, or 2. The five categories sum to **Cleanliness**, 0 to 10.

| Category | 0 | 1 | 2 |
|----------|---|---|---|
| Floors (swept, nothing underfoot) | dirty or cluttered | mostly clear | clean and clear |
| Beds made | unmade | partly made | neat |
| Belongings stowed | strewn about | some left out | all stowed |
| Trash and surfaces | full or dirty | partial | emptied and wiped |
| Bathroom / sink | dirty | partial | clean |

Bathhouse note: if cabins share a bathhouse instead of having their own sink, swap the fifth row for something like "Shoes and gear lined up" or "Windows and screens." It is a one-line change in the app (the `bathLabel` constant).

## Sparkle: a tiebreaker, not a score
Sparkle is a separate 0 to 10 value, starting at 5 by default (5 = met expectations). The inspector nudges it up if a cabin exceeds expectations, or down if it disappoints. Sparkle never changes Cleanliness. Its only job is breaking ties.

## Ranking and ties
- Cabins are ranked within each age group (Alpha, Beta, Gamma), for that day only, using only cabins scored that day. Each ranked cabin gets a unique position, 1 through N, with no ties in the final list.
- Sort order:
  1. Cleanliness, higher first.
  2. Sparkle, higher first, and only among cabins still tied on Cleanliness.
  3. Manual tiebreak, for any cabins still tied on both Cleanliness and Sparkle.
- Manual tiebreak: the app shows the tied cabins' five-category breakdowns side by side, and the inspector orders them by hand on the phone. That order becomes final for those cabins.
- Until the manual order is set, a tied cluster shows a provisional order (by cabin code) flagged as needing a tiebreak. The provisional order is not the result; it is a placeholder until the inspector resolves it.
- The daily award in each age group goes to the cabin holding rank 1 once its cluster, if any, is resolved.

## The 2-minute workflow
- Open the entry link on your phone, pick the day, pick the cabin.
- Tap 0/1/2 down the five rows. Adjust the Sparkle stepper up or down from its default of 5 if the cabin exceeded or fell short of expectations. Hit submit.
- An "all 2s" shortcut handles a spotless cabin's five categories in one tap; Sparkle is left as it was.
- Scores land in one shared sheet, and the dashboard updates live for everyone watching.
- If a tie needs breaking, a banner appears on the entry page. Tap it to put the tied cabins in order, right there on the phone.
