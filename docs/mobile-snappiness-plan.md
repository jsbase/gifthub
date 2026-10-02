# Mobile Snappiness — Audit & Implementation Plan

**Repo:** `D:\GitHub\wishy` · **Branch bei Messung:** `feature/design-polish` (working tree clean)
**Datum:** 2026-10-02 · **Modus:** Operate · **Plattform:** Web (PWA-flavoured, `viewportFit: 'cover'`)

Betrifft: perceived latency, responsiveness, reliability auf Mobile-Viewports.

> ### Revisionshistorie
>
> **Rev. 2 (nach Code-Review, 17 Befunde).** Rev. 1 enthielt Fehler, die eine
> Umsetzung verhindert oder **stumm** wirkungslos gemacht hätten. Die
> substanziellen:
>
> | # | Korrigiert |
> |---|---|
> | 1 | **Toter Auth-Guard** — `proxy.ts` prüfte einen Pfad, den es nicht gibt; `if (!auth)` war nie true. Live-Bug, in Rev. 2 als **Phase 0** behoben (Code + verifiziert) |
> | 2 | §4b prescribte ein `::before` auf einem Button mit `overflow-hidden` → wird **geclippt**, der 44-px-Fix wäre stumm wirkungslos gewesen. Fix wächst jetzt den Button, Clip wandert in einen inneren Wrapper |
> | 3 | §3c: die optimistische Zelle war voll klickbar → `DELETE /api/gifts/temp` → 404. Temp-Eintrag ist jetzt nicht-interaktiv |
> | 4 | §3b: „invertiert ≤ 50 ms" war unerfüllbar — die Sheet ist zwei `<ul>`-Sektionen, ein Wechsel ist ein **Re-Parenting** |
> | 5 | §3c: „Formularwerte wiederherstellen" ist gegen ein unmountetes Formular unerfüllbar — Zusage entfernt, Begründung ergänzt |
> | 6 | §4f.1 (`min-h-11` auf `buttonVariants`) hätte §4a/§4b **im selben Commit aufgehoben** |
> | 7 | §3a: „Zählwerte aus derselben Antwort" — für Toggle/Delete gibt es **keine** Datenquelle; Delete war nicht behandelt |
> | 8 | §2b: Skeleton ohne Count-Flash und Fuß-Zeile → Layout-Shift-Zusage falsch |
> | 9 | §5.7: Safe-Area im `container` wird ab 640 px von der `@media`-Ladder überschrieben |
> | 10–13 | Falschaussagen korrigiert: „`proxy.ts` schützt bereits", „`permissionState` wirft", „Suspense verursacht das Start-Veil", „bcrypt blockiert den Event-Loop" |
> | 14 | §5.5: Löschen ohne Unregister lässt installierte Worker weiterlaufen → **Tombstone** als Pflichtschritt |
> | 15–17 | `getSelectedMember` löst per **ID** auf · `MemberGiftsDialogProps` braucht **kein** `lang` · „~15 KB" unbelegt (einziges Artefakt: 7.592 B) |
>
> Zusätzlich aufgenommen: **§1e** — die Member-Zeile wird über ihre **volle**
> Fläche klickbar (heute nur die `1fr`-Spalte; `SheetProgress` ist ein
> Geschwister des Buttons).

---

## 0. Kurzfassung

Gemessen wurde mit Chromium unter **Pixel 5 / iPhone 12 / 320×568**, einmal unthrottled
(localhost, warmer Dev-Server, warme DB) und einmal unter **Slow 4G (150 ms RTT, 1,6 Mbps)
mit 4× CPU-Throttling**. Die Zahlen unten sind Messwerte, keine Schätzungen.

Die vier geforderten Bereiche, mit dem jeweils gemessenen Kernproblem:

| Bereich | Befund | Messwert (Slow 4G + 4× CPU) |
|---|---|---|
| Modal-Latenz | Tipp auf Gruppenname → **306 ms完全没有 jede visuelle Rückmeldung**, dann Dialog, dann **leer**, dann erst Zellen | 306 ms tot · 344 ms leerer Dialog |
| Optimistic UI (Gifting) | Neue Zelle erscheint erst nach POST **+ 2 identischen GETs**; Markieren-Kaufen invertiert die Zelle erst nach **903 ms** | 878 ms add · **903 ms toggle** |
| Padding / Layout | `container`(16) + `px-4`(16) + `px-5`(20) = **52 px** bis zum Member-Namen; Header-Wortmarke sitzt bei 16 px → **37 px Versatz auf demselben Screen** | `memberNameLeft: 53` bei 320/390/393 px |
| Touch Targets | **7 Elemente / 5 Stellen** unter 44×44; Language-Switcher 36×36, Logo 32 px hoch, Footer-Links 19,5 px, Menü-Items 42,5 px | siehe §4 |

Zusätzlich gefunden (du hast „Full stack" gewählt): **3 serverseitige Latenz-Multiplikatoren**,
ein **kaputter Service Worker**, ein **Toast, der die gesamte Navigation verdeckt**, und
**fehlende Safe-Area-Nutzung** trotz `viewportFit: 'cover'`.

> **Zum Padding:** bestätigt, das ist genau der Punkt. Die Landingpage hat das bereits
> richtig gelöst — sie hat ihr eigenes `px-4`/`sm:px-6` entfernt und ist damit auf der
> Header-Achse. Das Dashboard trägt die *gleiche* Redundanz noch und ist damit an
> drei Stellen 52 px breit. Details + Fix in §1.

---

## 1. Layout: Padding auf dem Dashboard

### Diagnose

`app/[lang]/dashboard/page.tsx:185-207` stapelt drei horizontale Innenabstände übereinander:

```
<main>                                     (app/[lang]/dashboard/page.tsx:167)
 └ <div className="container mx-auto">     (Zeile 185)
    └ <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">   (Zeile 187-194)
       └ <div className="… px-5 py-6 sm:px-8 sm:py-7">   (Zeile 196-206)  ← das Sheet
```

Gemessen (computed styles, Chromium):

| Element | `padding-left` | Kumuliert bis Inhalt |
|---|---|---|
| `.container` (global, `globals.css:437-442`) | `16px` | 16 |
| innere Spalte `px-4` | `16px` | 32 |
| Sheet `px-5` | `20px` | **52** |

Gemessene Kante des Member-Namens: **`left: 53px`** — identisch bei 320 px, 390 px und 393 px.
Header-Wortmarke (`header > div`): `padding-left: 16px`.

**Ergebnis: der Inhalt steht 37 px rechts von der Kopfzeile auf demselben Screen.**

Das ist exakt der Defekt, den DESIGN.md auf der Landingpage bereits beseitigt hat
(„it put the content 72px right of the header wordmark and of the footer's copyright,
on the same screen"). Verifiziert: auf der Landingpage misst die innere Spalte
`padding-left: 0px` — der Fix ist dort angekommen, auf dem Dashboard nicht.

Zweiter Messwert, vertikal: Member-Zeilen beginnen bei `y = 282 / 395 / 508`,
Zeilenpitch **113 px**. Bei 320×568 liegt der realistische Fold (Viewport minus
Browser-Chrome, 85 %) bei **483 px**:

```json
{ "realisticFold": 483,
  "memberRows": [ {top:282, fullyVisible:true}, {top:395, fullyVisible:true}, {top:508, fullyVisible:false} ],
  "membersFullyAboveFold": 2 }
```

**Auf dem kleinsten unterstützten Screen sind 2 von 3 Mitgliedern sichtbar.**
Ursache: 32 px `py-8` über dem Sheet + 24 px `py-6` im Sheet + 147 px
`MemberListHeader` (Label + zwei gestapelte 44-px-Buttons mit 12 px Gap + `pb-4`).

### Plan

**1a — die redundante Schicht entfernen (der eigentliche Fix).**
`px-4 sm:px-6` von der inneren Spalte nehmen, `max-w-5xl` **beibehalten**.

DESIGN.md sagt ausdrücklich, dass das Dashboard sein `max-w-5xl` behalten soll
(„a mounted sheet is *meant* to sit inset from the desk on all four sides").
Das gilt für die **Breite**, nicht für eine zweite Padding-Schicht. `max-w-5xl`
ohne `px-4` → Sheet-Kante bei 16 px + 16 px = 32 px; Inhalt bei 36 px.
Das Sheet sitzt weiterhin auf allen vier Seiten eingelassen — der Intent bleibt.

```diff
  <div className={cn('container', 'mx-auto')}>
    <div
      className={cn(
        'mx-auto',
        'max-w-5xl',
-       'px-4',
        'py-8',
-       'sm:px-6',
        'sm:py-12'
      )}
    >
```

**1b — Sheet-Innenabstand auf Phone verkleinern.** `px-5` → `px-4` unter `sm`,
`sm:px-8` bleibt. Im Dialog macht der Primitive das bereits so
(`ui/dialog.tsx:99` → `'p-5 xs:p-4'`); das Dashboard-Sheet sollte dieselbe
Ladder haben, damit Dialog und Sheet auf einem Screen dieselbe Kante zeigen.

**1c — vertikaler Luft im Above-the-Fold-Bereich.** `py-8` → `py-6` unter `sm`.
Das Sheet bleibt eingelassen, rückt aber 8 px nach oben.

**1d — `MemberListHeader` unter `sm` straffen.** Aktuell `gap-4` + `pb-4` =
20 px vertikale Luft für 100 px Buttons. Unter `sm` auf `gap-3` + `pb-3`
(16 px) senken. Der `label-print`-Abstand über dem Button-Block bleibt,
weil er die Eyes des Labels trägt.

**1e — die Member-Zeile wird über ihre volle Breite klickbar.**

Struktur heute (`member-list.tsx:150-243`):

```tsx
<li className='relative grid items-center gap-x-6 py-5 grid-cols-[1fr_auto] animate-reveal-in'>
  <Button className='… h-auto min-h-[72px] …'>…</Button>   ← Spalte 1fr
  <SheetProgress />                                          ← Spalte auto
  {showDeleteButtons && <div>…remove…</div>}                  ← nur im Removal-Modus
</li>
```

`SheetProgress` ist ein **Geschwister** des Buttons, kein Kind. Die klickbare
Fläche ist damit heute exakt die `1fr`-Spalte — **nicht** die Fortschritts-
spalte und **nicht** der 24-px-Gutter (`gap-x-6`).

Fix: Der Button über **beide** Spalten strecken, `SheetProgress` hinein (es ist
ohnehin `aria-hidden`, `sheet-progress.tsx:49`).

```diff
  'grid-cols-[1fr_auto]' →  'grid-cols-1'
  <Button …>               →  <Button className='w-full flex items-center justify-between gap-x-6 …'>
    <div>…Name + Regel…</div>   …Name…
  </Button>                     <SheetProgress unbought={unbought} total={total} />
  <SheetProgress … />
```

Im Removal-Modus: `grid-cols-[1fr_auto]` mit Button + Remove-Button als zwei
Kinder, dritte Spalte bleibt wie heute deklariert.

**Warum Button-Inhalt statt Overlay:** Ein `<li>`-weites Overlay hätte einen
Button **im** Button (der Remove-Button steckt im selben Grid) — ungültiges
HTML. Der Button behält so Fokus, `aria-label` und `data-testid`.

**Nebeneffekt:** Die 80-zeilige Kommentar-Lücke in `member-list.tsx:158-177`
zum Drittenspalten-Workaround wird überflüssig — das Problem existiert nur,
weil zwei Kinder in einem `1fr_auto`-Grid lagen.

**Zur 112/113-px-Messung:** Die Zeile ist `py-5` (40 px) auf dem `<li>` plus
`min-h-[72px]` auf dem Button = **112 px**, dazu 1 px `border-b` zwischen den
Zeilen. Die gemessenen 113 px sind dieser Rand, **keine** Verletzung der
DESIGN.md-Pinnung. Die frühere Fassung dieses Plans schrieb, `py-5` sitze auf
einem inneren Div — das war falsch, es sitzt auf dem `<li>`.

### Acceptance

- `memberNameLeft` ≤ **37 px** bei 320/390/393 px; Linke-Kante des Sheets =
  Linke-Kante der Header-Wortmarke ± dieselbe Innenkante.
- `membersFullyAboveFold` bei 320×568 ≥ **3**.
- **Klick auf die Member-Zeile öffnet die Sheet an jeder Stelle** — Name,
  Fortschrittsspalte und der `gap-x-6`-Gutter (mit `elementFromPoint` an den
  Zeilenecken prüfen, §7a). Der Remove-Button öffnet sie **nicht**.
- Zeilenhöhe bleibt **112 px** (± 1 px Rand) — die von DESIGN.md gemessene
  Vorgabe.
- Sheet-Innenabstand Dialog == Sheet-Innenabstand Dashboard bei `xs`.
- Kein horizontaler Overflow: `documentElement.scrollWidth == innerWidth`.

---

## 2. Modal-Latenz: Gruppenname antippen

### Diagnose

`app/[lang]/dashboard/page.tsx:116-127`:

```ts
const handleMemberClick = async (memberId: string) => {
  const response = await fetch(`/api/gifts?memberId=${memberId}`);   // ← wartet
  const data = await response.json();
  setSelectedMemberId(memberId);                                      // ← erst DANACH
  setMemberGifts(data.gifts);
};
```

`selectedMemberId` wird **erst nach dem Round-Trip** gesetzt. Vorher ist
`isOpen={!!selectedMemberId}` (`page.tsx:227`) `false`, es existiert kein
Dialog, kein Scrim, kein Skeleton. Zwischen Tipp und `setSelectedMemberId`
passiert am Row **absolut nichts** — kein `:active`, kein Press-State,
kein `aria-busy`.

Gemessen (Slow 4G + 4× CPU), Poll pro Frame ab dem Klick:

```
click -> first visual change ... 306ms (dialog)
click -> dialog fully visible . 344ms
gift cells on screen .......... 0
```

**306 ms komplett tote Zone.** Der Nutzer tippt, es passiert nichts, er tippt
nochmal. Der zweite Tipp ist kein Duplikat-Schutz, sondern der übliche
Retry-Impuls — und weil die Row währenddessen voll treffbar bleibt, feuert er
einen **zweiten** `GET /api/gifts`, und das zuletzt aufgelöste gewinnt
(`page.tsx:122-123`, kein Request-Token).

Zweiter Befund in derselben Kette, `page.tsx:225-246`:

```tsx
<Suspense fallback={<LoadingSpinner />}>
  <MemberGiftsDialog … />
</Suspense>
```

`LoadingSpinner` ist `fixed inset-0 bg-board/85 backdrop-blur-sm z-50`
(`components/loading-spinner.tsx:21-31`). Das heißt: **falls der lazy Chunk
noch nicht da ist, verdeckt ein bildschirmfüllender Blur-Veil die ganze App.**
Ein `backdrop-filter` über die volle Viewport-Fläche ist auf einem Mobile-GPU
genau der teure Compositing-Pfad, der im Moment des Tippens am meisten
kostet. Und `lazy()` bringt hier nichts: das Element wird immer gerendert
(`isOpen` ist nur `false`), der Import startet also beim ersten Render — die
Suspense-Grenze existiert nur, um bei einem Kaltstart schlecht auszusehen.

Dritter Befund: `dashboard/page.tsx:152-154` ersetzt den kompletten Baum durch
`return <LoadingSpinner />`, solange `loading || !groupName || !dict`. Die App
startet also mit einem bildschirmfüllenden Blur-Veil. Das kommt **aus dem
Early-Return, nicht aus dem `Suspense`** — die Grenze bei `:225` wird im
Erstrender nie erreicht. Beide Wege führen zum selben sichtbaren Ergebnis, sie
sind aber zwei getrennte Ursachen mit zwei getrennten Fixes: den Early-Return
nimmt Phase 5 (§5.3d) mit, das `backdrop-blur` selbst behandelt §5 unabhängig
davon.

### Plan

**2a — Dialog sofort öffnen, Daten nachladen.** `handleMemberClick` wird
synchron bis `setSelectedMemberId` und startet den Fetch danach:

```ts
const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);

const handleMemberClick = (memberId: string) => {
  setSelectedMemberId(memberId);          // Dialog im selben Frame offen
  setPendingMemberId(memberId);
  void loadMemberGifts(memberId);         // async, ersetzt den Skeleton
};
```

Perceived latency fällt von 306 ms auf **~16 ms** (ein Frame). Die Daten
kommen nach, aber der Nutzer sieht bereits das Sheet-Anatomie.

**2b — Skeleton im Sheet, in der Sprache des Albums.** Kein Spinner, kein
Shimmer: DESIGN.md hat **genau einen** authored Moment (`collect-settle`) und
vermutet dekorative Bewegung. Das Skeleton ist die **leere Sheet-Anatomie**:
`SectionHead` mit `dict.openIdeas` und `00`, darunter zwei bis drei
`bg-wash`-Blöcke in Cell-Höhe. Kein Text, keine neue Copy nötig.

> **Das Skeleton ist NICHT layout-neutral, und die Zusage muss korrigiert
> werden.** `DialogContent` ist `flex flex-col xs:gap-4`
> (`ui/dialog.tsx:91-124`). Der gefüllte Zweig rendert **zwei** Flex-Items, die
> ein naives Skeleton nicht hat:
>
> - die **Count-Flash-Zeile** über den Sektionen (`member-gifts-dialog.tsx:284`,
>   `gifts.length > 0`-Guard) — fügt ein Item **oben** ein,
> - die **borderierte Fuß-Zeile** mit dem Add-Knopf darunter (`:462`, gleicher
>   Guard) — fügt ein Item **unten** ein.
>
> Jedes dieser Items verschiebt per `gap-4` alles um sich herum um ≈16 px plus
> eigene Höhe. Zusätzlich kann ein fixer `bg-wash`-Block nicht gegen echte
> Zellen matchen, die `min-h` 44 px haben und mit Beschreibung/URL wachsen.
>
> **Konsequenz:** Beide Elemente samt ihrem `gap-4` **müssen** ins Skeleton.
> Und die Zellen aus einer **echten 3-zeiligen** Zelle dimensionieren, nicht
> aus einem geratenen Wert. Die Kriterien „shift < 2 px" und „kein CLS-Eintrag"
> bleiben erst bestehen, wenn das **gemessen** ist — bis dahin sind sie
> Soll-Werte, keine Zusicherungen.

**2c — Redundante Taps abfangen.** Während `pendingMemberId === id` ist die
Row `aria-busy="true"` und ignoriert weitere Taps. Nicht stillschweigend:
der Dialog ist in dem Moment bereits offen, der Tipp ist also sichtbar
angekommen.

**2d — `lazy()` + `Suspense` entfernen.** Statischer Import. Löscht den
Bildschirm-BBlur-Veil als Modal-Fallback **komplett**.

> **Zwei Korrekturen an dieser Stelle.** Erstens kommt das Blur-Veil beim
> **Dashboard-Erstrender** nicht aus dem `Suspense`, sondern aus dem
> expliziten Early-Return `if (loading || !groupName || …) return <LoadingSpinner />`
> (`page.tsx:152-154`), der **vor** dem JSX mit der Suspense-Grenze (`:225`)
> steht. React rendert nie beides in einem Durchlauf. `lazy()` zu entfernen
> gewinnt dort also **nichts** — der Satz „erspart den Fallback-Pfad beim
> Dashboard-Erstrender" ist gestrichen. Das Start-Veil wird über den
> `backdrop-blur`-Abbau in `loading-spinner.tsx` behandelt.
>
> Zweitens sind die **~15 KB nicht belegt.** Das Repo hat weder Bundle-Analyzer
> noch Size-Budget noch ein committetes Manifest. Das einzige Artefakt
> (`.next/static/chunks/045lo0dx4keem.js`, gebaut 2026-10-01, bereits veraltet)
> ist **7.592 B roh**, und die Dialog-Module liegen ohnehin schon im
> Haupt-Chunk. Die Zahl wird entfernt; sie ist nicht entscheidungsrelevant und
> darf nicht in ein Kriterium wandern. Vor dem Merge mit `next build` messen,
> falls die Bundle-Größe überhaupt eine Rolle spielt.

**2e — Doppelten Fetch eliminieren.** `page.tsx:232-237` feuert bei jeder
Mutation **zwei identische** Requests:

```tsx
onGiftAdded={() => {
  if (selectedMemberId) {
    handleMemberClick(selectedMemberId);      // GET /api/gifts?memberId=X
    updateMemberGiftCount(selectedMemberId);  // GET /api/gifts?memberId=X  ← identisch
  }
}}
```

`updateMemberGiftCount` (`page.tsx:138-150`) ruft dieselbe URL ab, nur um
`unbought`/`total` zu zählen — beides steht bereits in derselben Antwort.
Messung bestätigt 3 Requests pro Mutation statt 2. Fix: **ein** Fetch,
beide Ableitungen daraus. Halbiert die Mutations-Roundtrips.

**2f — Request-Token gegen Reihenfolge.** `loadMemberGifts` trägt eine
 monoton steigende ID; ein Response mit veralteter ID wird verworfen. Damit
kann ein doppelter Tipp das Ergebnis nicht mehr überschreiben.

### Acceptance

- `click -> first visual change` ≤ **50 ms** (unthrottled), unabhängig von der Netzlast.
- **0** Bildschirm-BBlur-Veils auf irgendeinem Pfad (`backdrop-blur` aus `loading-spinner.tsx` entfernt).
- 1 Request pro Tipp; schnellere Folge-Tipps erzeugen keinen zweiten.
- Kein Layout-Shift zwischen Skeleton und Zellen (`shift < 2 px`).
- Kein CLS-Eintrag im Layout-Shift-Log beim Öffnen.

---

## 3. Optimistic UI: Geschenk hinzufügen & als gekauft markieren

### Diagnose (a) — hinzufügen

`components/member-gifts-dialog.tsx:132-167`. Der Submit-Tap **hat** Feedback:
`isLoading` schaltet den Button auf `dict.adding` ("Wird hinzugefügt…"),
gemessen ab dem nächsten Frame. Das ist ehrlich und wird hier nicht
wegdiskutiert.

Was fehlt, ist alles danach. Der Pfad ist strikt sequenziell:

```
POST /api/gifts                       ← wartet
  └ onGiftAdded()
      ├ GET /api/gifts?memberId=X      ┐ parallel,
      └ GET /api/gifts?memberId=X      ┘ aber beide müssen fertig sein
          └ erst dann rendert die neue Zelle
```

Gemessen: **878 ms** von Submit bis die Zelle sichtbar ist, **3 Requests**,
davon zwei byte-identisch (siehe 2e). Zwischen dem Relabeln des Buttons und
der erscheinenden Zelle liegen auf Slow 4G rund 800 ms, in denen der einzige
sichtbare Zustand „der Knopf sagt gerade 'wird hinzugefügt'". Die Zelle, die
das Produkt erzeugt hat, ist noch nirgends.

### Diagnose (b) — als gekauft markieren

`components/member-gifts-dialog.tsx:169-201`. Das ist der gravierendere Fall,
weil es **das Moment ist, für das das Produkt existiert**.

Ablauf:

```
PUT /api/gifts/:id/toggle             ← wartet
  └ toast
  └ setChangedId(id)                  ← erst hier startet collect-settle
  └ onGiftAdded() → 2× GET
      └ erst dann invertiert die Zelle
```

Zwischen Tipp und Invertierung ist das einzige Signal
`isPending && 'pointer-events-none opacity-60'` auf dem Mark-Button
(`components/gift-card.tsx:151`). **Ein Abdunkeln liest sich als „deaktiviert",
nicht als „in Arbeit".** Es sagt nicht, dass etwas passiert, sondern dass
etwas gerade *nicht* passiert.

Gemessen, Poll des `background-color` pro Frame ab dem Tipp:

```
cell background before ........ rgb(253, 253, 252)
inversion observed at ......... 903ms after the frame following the tap
requests ...................... 3: toggle, /api/gifts?memberId=… (×2)
```

**903 ms.** Auf einem günstigen Android auf 3G ist das 2+ Sekunden, in denen
das Produkt nicht tut, wozu es da ist — und die Toggle-Response liefert mit
`{ isPurchased }` (`app/api/gifts/[id]/toggle/route.ts:34`) nicht einmal das
aktualisierte Gift, sodass ein Refetch zwingend ist.

### Plan

**3a — lokale Quelle der Wahrheit für die Sheet-Zellen.**
`memberGifts` wandert aus `dashboard/page.tsx` in einen kleinen
`useReducer` (oder `useOptimistic`) innerhalb von `member-gifts-dialog.tsx`,
initialisiert aus dem Prop. Der Dialog ist dann die einzige Stelle, die
`isPurchased` ändert.

**Die Zählwerte kommen aus dem lokalen Array, nicht aus einer Antwort.** Das
ist der entscheidende Punkt, und er wird oft falsch geplant: `POST /api/gifts`
liefert `{success, gift}` (`gifts/route.ts:72-75`), aber
`PUT …/toggle` gibt **nur** `{ isPurchased }` (`toggle/route.ts:34`) und
`DELETE …` nur `{success, message}` (`[id]/route.ts:168-171`). Es gibt also
**keine** Antwort, aus der sich `unbought`/`total` ableiten ließe. Die
Ableitung kommt stattdessen aus `openGifts.length` und `gifts.length`, die der
Dialog ohnehin schon berechnet (`member-gifts-dialog.tsx:106-117`):

```ts
// an den Parent, synchron nach der lokalen Mutation
onCountsChange({ unbought: openGifts.length, total: gifts.length });
```

`member-list.tsx` bekommt damit seine Zahlen ohne einen einzigen zusätzlichen
Request. Das ist der Punkt, an dem der Refetch wirklich entfällt — nicht ein
cleverer Abruf.

**3b — Toggle optimistisch.**
`handleTogglePurchased` mutiert zuerst lokal, setzt `changedId` und feuert
danach den PUT.

> **Kein In-Place-Invertieren.** Die Sheet ist **zwei** `<ul>`-Sektionen, per
> `isPurchased` getrennt (`member-gifts-dialog.tsx:106-117`, `:396`, `:413`).
> Ein Wechsel ist ein **Re-Parenting**: die Zelle wird aus der offenen Sektion
> unmounted und in der gekauften an ihrer `createdAt desc`-Position neu
> gemountet — bei einer neuen Zelle also **ganz oben**, bei einer alten
> **unterhalb der Scrollposition**. Das ist kein Fehler, aber es muss
> garantiert werden, nicht angenommen.
>
> **Platzierungsgarantie:** Die gesammelte Sektion ist die untere. Wandert
> eine Zelle nach unten und liegt die Sektion außerhalb des Sichtbaren, sieht
> der Nutzer sie verschwinden — das ist als Aktion falsch. Deshalb: nach dem
> optimistischen Wechsel **einmal scrollen** (`sectionRef.scrollIntoView`),
> damit die Zielzelle im Sichtbaren landet. Ohne das ist der optimistische
> Toggle eine halbe Enthüllung.
>
> **Rollback:** zurück nach „offen", also **Row kehrt in die offene Sektion
> zurück** — mit einem Roll-Toggle desselben Zählers. `collect-settle` kann
> dabei **nicht** laufen: es ist auf `justChanged && isCollected` gewichtet
> (`gift-card.tsx:101`), und nach einem Rollback ist die Zelle nicht mehr
> gesammelt. Die Rückbewegung wird ohne Animation zurückgenommen.

- Erfolg → Serverwert ist die Wahrheit, Pending-Marker entfernen.
- Fehler → lokaler Zustand zurück, `toast.error`.

**3c — Hinzufügen optimistisch.**
Beim Submit ein temporäres Gift mit `id: temp` synthetisieren und sofort in
`openGifts` einsortieren.

- Erfolg → Temp-Eintrag durch das Server-Gift ersetzen.
- Fehler → Temp-Eintrag entfernen, `toast.error`.

> **Der Temp-Eintrag muss nicht interaktiv sein.** `onDelete` fängt heute das
> **Objekt** per `gifts.find(c => c.id === id)` ein (`member-gifts-dialog.tsx:401-405`)
> und `handleConfirmDelete` nutzt `pendingDeletion.id`. Ein Temp-Eintrag mit
> `id: 'temp'` sendet also `DELETE /api/gifts/temp` → **404** → Fehler-Toast,
> während das echte Gift stehenbleibt; ein Toggle darauf schickt ein PUT für
> eine nie existierende ID. Der Delete-Button ist heute **überhaupt nicht**
> gegen Pending geschützt (`gift-card.tsx:228-258`).
>
> Zwei Änderungen, beide nötig: `disabled` auf Tick **und** Delete, solange
> `pendingAdd` (analog zum vorhandenen `disabled={isPending}` am Tick), **und**
> `handleConfirmDelete` löst die ID aus dem aktuellen State neu auf, statt dem
> eingefangenen Objekt zu trauen.

> **Formularwerte im Fehlerfall.** „Werte wiederherstellen" ist gegen den
> geschlossenen Zustand **unerfüllbar**: `showAddGiftForm === false` unmountet
> das `<form>` (`:493-560`), ein Reset erreicht die Inputs nicht mehr, und die
> Werte liegen nur im unsteuerten DOM plus dem lokalen `giftData`-Snapshot
> (`:137-145`). Heute überleben sie **genau deshalb**, weil Close und Reset
> ausschließlich im Erfolgszweig laufen (`:157-159`).
>
> **Empfehlung: diese Zusage streichen, nicht umsetzen.** Close und Reset
> bleiben im Erfolgszweig — das erhält die heutige, korrekte Verlustfreiheit
> mit **null** Zusatzcode. Wer den Fehlerpfad trotzdem vollständig will, muss
> das Formular wieder öffnen, `defaultValue` auf den drei Feldern setzen und
> den Fokus zurückgeben. Das ist eine bewusste Produktentscheidung, keine
> technische Notwendigkeit.

**3d — Delete ist nicht optional.** §3 hat Delete initially nicht behandelt.
Sobald der Parent nicht mehr refetcht, muss der Dialog es selbst erledigen:
lokal entfernen und `onCountsChange` feuern. Sonst bleibt die gelöschte Zelle
sichtbar, bis das Sheet neu geöffnet wird.

**3e — Pending-Zustand am richtigen Ort.** Kein globaler Spinner. Der
Zustand hängt an der Zeile, die ihn betrifft. `components/gift-card.tsx`
bekommt dafür einen `pending?: boolean`-Prop, der **Tick und Delete gemeinsam**
deaktiviert; `togglingId` und `pendingAdd` laufen in einer kombinierten
Ableitung zusammen.

**3f — kein Erfolgstoast für Dinge, die man selbst gerade getan hat.**
Der `toast.success(dict.toasts.giftStatusPurchased)` nach einem optimistischen
Toggle ist redundant: die Zelle **ist** die Bestätigung. Toasts bleiben für
Fehler und für Dinge, die man nicht selbst gesehen hat (z. B. Login). Das
entlastet zusätzlich den Toast, der ohnehin die Navigation verdeckt (§5).

> **Copy-Hinweis:** 3c braucht **keine** neuen Strings — `memberGifts.adding`
> existiert in de/en/ru. Für eine `aria-live`-Ansage bei Pending wäre eine
> neue Zeile in allen drei Dictionaries nötig (§8). Ohne Live-Region ist die
> Optimierung vollständig; mit ihr wird sie screenreader-tauglich.

### Acceptance

- Toggle: neue Position der Zelle **sichtbar** ≤ **50 ms** nach dem Tipp
  (unthrottled), Zielsektion gescrollt, wenn sie außerhalb lag.
- Toggle: 1 PUT + **0** zusätzliche GETs.
- Add: Zelle sichtbar ≤ **50 ms** nach Submit, mit korrektem Titel.
- **Während `pendingAdd` sind Tick und Delete der Temp-Zelle deaktiviert**, und
  die ID jeder Bestätigung wird aus dem aktuellen State aufgelöst — kein
  `DELETE /api/gifts/temp`.
- Delete: Zelle verschwindet lokal, Member-Zähler aktualisiert ohne Refetch.
- **1** Request pro Mutation.
- Fehlerpfad: Temp-Eintrag verschwindet, Zähler stimmt wieder. **Keine Aussage
  über Formularwerte** — der Formular-Zweig ändert sich nicht.
- `prefers-reduced-motion`: `collect-settle` kollabiert (bereits in
  `globals.css:507-522` erledigt), die Invertierung selbst bleibt.

---

## 4. Touch-Target-Audit

### Spezifikation

> **Jedes interaktive Element hat eine Trefferfläche von mindestens
> 44 × 44 px. Der Primitive ist die Quelle dieser Untergrenze; ein Caller
> darf sie nur erhöhen, nie unterschreiten.**

`components/ui/button.tsx:46-54` definiert das bereits korrekt
(`h-11`/`w-11` = 44 px für `default`, `sm`, `icon`; `h-12` = 48 px für `lg`).
Der Doc-Comment dort (Zeilen 15-27) sagt ausdrücklich: *"Every size is 44px or
taller except `lg`, which is 48px. That is not a preference."*
**Jede Verletzung unten ist ein Caller, der diese Zusage überschreibt** —
also ein Drift gegen die eigene Doku des Primitives, kein Designkonflikt.

Zusätzlich, aus PRODUCT.md Accessibility: **primäre Dialog-Aktionen 48 px**
(nicht 44). Aktuell nutzen sie `size='default'` (44 px).

### Gemessene Verstöße

Gemessen mit `getBoundingClientRect()` auf allen interaktiven Elementen,
bei **320 px, 390 px und 393 px** — identisch in allen drei Breiten:

| # | Element | Gemessen | Ort | Datei:Zeile |
|---|---|---|---|---|
| 1 | `a[data-testid=logo]` | **129 × 32** | Header, jede Seite, einzige Navigation zurück | `components/header.tsx:87-94` |
| 2 | `button[data-testid=language-switcher]` | **36 × 36** | Header, jede Seite, einziger Sprachwechsel | `components/language-switcher.tsx:58-67` |
| 3 | `[role=menuitem]` ×3 (Deutsch/English/Русский) | **150 × 42.5** | Sprachmenü | `components/ui/dropdown-menu.tsx:27-28` |
| 4 | `a[data-testid=linkPrivacy]` | **79 × 19.5** | Footer, jede Seite | `components/footer-links.tsx:26-32` |
| 5 | `a[data-testid=linkTerms]` | **26.3 × 19.5** | Footer, jede Seite | `components/footer-links.tsx:33-39` |
| 6 | `Button` „Geschenkidee hinzufügen" | **359 × 44** | primäre Dialog-Aktion (soll 48) | `components/member-gifts-dialog.tsx:542-549` |
| 7 | `Button` destruktive Bestätigung | **44 hoch** | primäre Dialog-Aktion (soll 48) | `components/confirm-dialog.tsx:63-74` |

Rohtreffer: **7 von 11** interaktiven Elementen auf dem Dashboard, **7 von 13**
in der Sheet, **5 von 6** auf der Landingpage.

### Konform

Alles andere ist ≥ 44 px und bleibt unverändert — namentlich die beiden
wichtigsten Controls des Produkts:

| Element | Gemessen | Datei |
|---|---|---|
| `giftStrikethrough` (Mark als gekauft) | 44 × 44 (min) | `components/gift-card.tsx:126-152` |
| `giftDelete` | 44 × 44 (min) | `components/gift-card.tsx:228-258` |
| `dialogClose` | 44 × 44 | `components/ui/dialog.tsx:161-177` |
| Member-Zeile | 182.6 × 72 | `components/member-list.tsx:185-216` |
| `addGiftButton` (Blank Plate) | 359 × 158.9 | `components/member-gifts-dialog.tsx:318-340` |
| `addMemberButton` / `showRemoveMemberButtons` | 287 × 44 | `components/member-list-header.tsx:58-75` |
| `logout` | 108.1 × 44 | `components/header.tsx:98-109` |
| `addGiftSubmit` / „Abbrechen" | 359 × 44 | `components/member-gifts-dialog.tsx:541-558` |
| Inputs (`Input`, `Textarea`) | 44 | `components/ui/input.tsx:26` |

### Fixes

**4a — Logo-Link auf 44 px, ohne den Header-Rhythmus zu brechen.**
`header` ist `h-header` (56 px) mit `items-center`, also passt ein 44-px-Kind
ohne negative Margen. `py-1` → `min-h-11 flex items-center` in
`components/header.tsx:89`.

**4b — Sprach-Switcher: sichtbare Box bleibt 36 px, Trefferfläche wird 44.**
Das 24-px-Flag im Ring **darf** 36 px sein — das ist Material, gedruckt, kein
Fehler. Vergrößert wird nur die Trefferfläche.

**Nicht** per Pseudo-Element auf dem Button: `language-switcher.tsx:62` trägt
`overflow-hidden`, und `overflow` clippt die eigene generierte `::before`-Box.
Ein `before:-inset-1` auf diesem Element wird abgeschnitten und die Fläche
bliebe bei 36 × 36 — **stumm**, weil der Code angewendet aussieht und
`getBoundingClientRect()` (Border-Box des Buttons, nicht des Pseudo-Elements)
weiterhin 36 meldet. Der Clip wandert stattdessen in einen inneren Wrapper:

```diff
- <Button variant='ghost' size='icon'
-   className={cn('h-9 w-9 rounded-full overflow-hidden p-0 ring-1 ring-rule', …)}
+ <Button
+   variant='ghost'
+   size='icon'
+   className='relative h-11 w-11 p-0'
    data-testid='language-switcher'
    aria-label={selectedLanguage.name}
  >
-   <LanguageFlag … />
+   {/* the visible chip keeps its printed 36px; only the button grows */}
+   <span className='absolute inset-0 m-auto h-9 w-9 overflow-hidden rounded-full ring-1 ring-rule hover:ring-ink/40'>
+     <LanguageFlag … />
+   </span>
  </Button>
```

Der Button ist jetzt 44 × 44, die sichtbare Flag-Scheibe bleibt exakt 36 px
und behält ihren Clip. Passt mit 6 px Spiel in den 56-px-Header.

**4c — Menü-Items auf 44 px.** `py-2.5` → `py-3` in
`components/ui/dropdown-menu.tsx:28`: 22,5 px Zeilenhöhe (Tailwind-v4-Preflight
setzt `line-height: 1.5`) + 24 px = **46,5 px**.

**4d — Footer-Links: Trefferfläche ohne Layoutkosten.**
`inline-block py-2 -my-2` auf beiden Links. Box wächst auf 19,5 + 32 = **51,5 px**,
der Layout-Box bleibt 19,5 px, der Footer behält seinen Rhythmus.

**4e — primäre Dialog-Aktionen auf 48 px.** `size='lg'` auf dem add-gift
Submit (`member-gifts-dialog.tsx:542`) und auf der destruktiven Bestätigung
(`confirm-dialog.tsx:63`). Deckt die PRODUCT.md-Zusage ab.

**4f — Drift strukturell verhindern.**

Ein pauschales `min-h-11 min-w-11` auf `buttonVariants` wäre der naheliegende
Griff und wäre **falsch**: `min-height` schlägt `height`, also würde jeder
Caller mit `h-9`/`h-auto` eine 44-px-**Visuellbox** bekommen — auch der
Sprach-Switcher, der laut 4b optisch 36 px bleiben soll. Die Maßnahme würde
4a und 4b im selben Commit aufheben.

Stattdessen:

1. **Ein Testzeitpunkt-Assert** (§7a) ist der dauerhafte Wächter. Er ist
   ohnehin nötig, weil `getBoundingClientRect()` die Border-Box misst und
   **keine** Pseudo-Element-Trefferflächen kennt — eine Trefferfläche über
   `::before` ist damit prinzipiell nicht testbar. 4b wächst den Button, also
   ist es messbar; allgemein gilt: was §7a nicht messen kann, darf §4f nicht
   per CSS-Zwang „lösen".
2. **Im Doc-Comment von `button.tsx`** die Zusage um den Caller-Vertrag
   ergänzen: *Caller may raise the floor, never lower it.* Damit ist die
   Regel dort festgehalten, wo sie bisher nur steht — ohne die Geometrie
   eines Callers zu verändern.

> **WCAG-Hinweis, ehrlich formuliert:** WCAG 2.5.8 (Target Size Minimum, AA)
> verlangt 24 × 24 px und ist von allen sieben Elementen erfüllt. Die
> Verstöße sind Verstöße gegen die **eigene, dokumentierte** 44-px-Zusage in
> PRODUCT.md und im Doc-Comment von `button.tsx` — nicht gegen WCAG AA. Das
> ist kein Argument gegen die Fixes; es ist die Begründung, warum sie P1 und
> nicht P0 sind.

### Acceptance

- Test aus §7 läuft auf allen Routen, de/en/ru, `sm` und `xs`, Light und Dark.
- Kein Element < 44 × 44 außerhalb der Test-Skip-Liste (§7).
- Optisch: Header-Höhe unverändert 56 px; Footer-Höhe unverändert;
  Sprach-Chip optisch unverändert 36 px.

---

## 5. Netzwerk- und Server-Latenz

Diese Befunde liegen auf der anderen Seite des Drahts und vervielfachen
alles aus §2 und §3. Sie stehen hier, weil ein Modal-Fix ohne sie auf einem
echten 4G-Gerät weiterhin zwei Roundtrips plus ein Datenbank-Hop kostet.

### 5.1 `getGroupIdFromToken` macht bei *jedem* API-Request einen DB-Lookup

`lib/auth-server.ts:16-26`:

```ts
const verified = await jwtVerify(token, …);
const groupName = verified.payload.groupName as string;
const group = await prisma.group.findUnique({ where: { name: groupName } });
return group?.id;
```

Das JWT identifiziert bereits die Gruppe. Um sie in eine ID zu übersetzen,
geht es **jedes Mal** nach Neon. Das passiert für `/api/gifts`,
`/api/gifts/:id`, `/api/gifts/:id/toggle`, `/api/members`, `/api/members/:id`.

**Fix:** `groupId` in die JWT-Payload legen, die Lookups auflösen.
Nur `app/api/auth/login/route.ts:42` signiert derzeit überhaupt ein Token; die
Register-Route importiert `SignJWT` nicht und setzt kein Cookie. Der Feldname
wird dort also nur ergänzt, wo ein Token erzeugt wird. `getGroupIdFromToken`
liest dann `verified.payload.groupId`.

Konsequenz für bestehende Cookies: ein Token ohne `groupId` (alle 7 Tage
gültigen Sessions) fällt auf den alten Lookup zurück. Das Feld deshalb
nullable behandeln, statt einen 401 zu werfen — sonst fliegen alle
eingeloggten Nutzer bei Deploy raus.

**Wirkung:** −1 DB-Roundtrip auf **jeden** Request der App.

### 5.2 `bcrypt.hash(cost 10)` für ein Passwort, das niemand benutzt

`app/api/members/route.ts:131-138`:

```ts
const temporaryPassword = crypto.randomBytes(16).toString('hex');
const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
const user = await prisma.user.create({ data: { name, password: hashedPassword } });
```

Der Wert wird nicht ausgegeben, nicht gespeichert, nicht verglichen und ist
nicht wiederherstellbar. PRODUCT.md sagt ausdrücklich: *"A `User` row exists in
the schema but represents a **member name** recorded inside the group, not a
login identity."* Members werden nie authentifiziert.

Ein bcrypt-Hash mit Cost 10 ist Arbeit für einen Wert, den niemand verwenden
kann — das ist das eigentliche Argument, und es braucht keine Zeitmessung.

> **Zwei Zahlen-Fehler, die hier raus müssen.** Erstens ist „~60–100 ms" die
> Zahl des **nativen** `bcrypt`. Die Route nutzt aber `bcryptjs`
> (`members/route.ts:3,132`), und das chunkt die Arbeit und yieldet über
> `setImmediate` alle `MAX_EXECUTION_TIME = 100 ms`. Zweitens folgt daraus: es
> **blockiert den Event-Loop nicht**, „eine ganze CPU-Slot-Milli" ist für diese
> Implementierung falsch.
>
> **Die Begründung ist inhaltlich, nicht messbasiert** — und genau deshalb
> stärker: Ein Krypto-Hash auf ein Passwort zu berechnen, das weder gespeichert
> noch verglichen noch wiederhergestellt werden kann, ist keine
> Optimierungsfrage, sondern überflüssige Arbeit mit Sicherheits-Kostüm.
> Das Argument steht ohne jede Millisekundenzahl.

**Fix:** Das `password`-Feld nullable machen und für Member `null` schreiben.
Das braucht eine Prisma-Migration auf `User.password`.

**Wichtig:** Das ist die einzige Stelle im Plan, die ein Schema ändert. Erst
prüfen, ob `password` in `schema.prisma` als `NOT NULL` geführt wird und ob
irgendwo ein Pfad durch `User.password` läuft (`app/api/auth/login/route.ts:34`
vergleicht gegen `Group.password`, nicht `User.password` — das ist eine andere
Tabelle). Vor dem Merge prüfen, nicht danach.

### 5.3 Dashboard: 3 sequentielle Roundtrips + redundante Auth-Verifies vor dem ersten Bild

`app/[lang]/dashboard/page.tsx` ist eine Client-Komponente, die ihre eigenen
Daten lädt:

```
getDictionary(lang)              ← dynamischer JSON-Import im Client
  └ await verifyAuth()           → GET /api/auth/verify   (RTT 1)
      └ fetchData()
          ├ await /api/members   → (RTT 2)
          └ await /api/gifts     → (RTT 3)   ← sequentiell, nicht parallel
```

Gemessen (localhost, warmer Server, warme DB): **9 API-Calls** bis zur Member-Liste,
davon **5× `/api/auth/verify`**. Unter Slow 4G + 4× CPU: **11,2 s** von Login
bis zur gerenderten Liste.

Ehrliche Einordnung zu den 5 Verifies: Next.js aktiviert `reactStrictMode`
per Default, Effekte laufen in Dev doppelt — die **Paare** (313 ms, 2656 ms,
2808 ms) sind ein Dev-Artefakt. In Produktion sind es **3**:
1. `Header` beim Mount (`header.tsx:28-58`)
2. `Header` nochmal, weil die Effect auf `[groupName, pathname]` läuft und
   `pathname` sich beim Routenwechsel ändert
3. `dashboard/page.tsx:91` in `init()`

Zwei davon sind vollständig vermeidbar.

**Fix 5.3a — `fetchData` parallelisieren.** `/api/members` und `/api/gifts`
mit `Promise.all`. −1 sequentieller RTT sofort, ohne Architekturwechsel.

**Fix 5.3b — `Header`-Effect entschärfen.** `pathname` aus der Dependency-Liste
nehmen, solange der Auth-Stand nur vom Group-Namen abhängt
(`header.tsx:58`). Oder den Auth-Stand einmal im Layout halten und via Context
teilen. −1 Request pro Navigation.

**Fix 5.3c — `loadTranslations` beim Sprachwechsel entfernen.**
`components/language-switcher.tsx:33` macht `await loadTranslations(langCode)`,
also einen **Server-Action-Roundtrip**, bevor `router.push` läuft (Zeile 35).
Der Server-Action füllt `dictionaryCache` — einen Modul-Cache **auf dem
Server** (`app/[lang]/dictionaries.ts:3`). Der Client hat einen eigenen,
getrennten Cache. Der Roundtrip wärmt also nichts, was der Client braucht, und
verzögert jeden Sprachwechsel um einen vollen RTT. Einfach streichen.

**Fix 5.3d (der große) — Dashboard als Server Component.**
`page.tsx` auf Server Component umstellen, ein Client-Schild hält die
Interaktivität. Vorgehen:

```
app/[lang]/dashboard/page.tsx          (Server Component)
  ├ await params → lang
  ├ await getDictionary(lang)          (bereits serverseitig)
  ├ JWT aus cookies() lesen + verifizieren  (kein fetch, kein RTT)
  ├ redirect('/' + lang) falls ungültig       (statt Client-redirect nach Spinner)
  ├ prisma: members + gifts + counts   (parallel, 1–2 Queries)
  └ rendert <DashboardView … />

components/dashboard-view.tsx           ('use client')
  ├ Dialog-Open-Logik + optimistische Mutationen
  ├ add / toggle / delete
  └ logout
```

**Ergebnis: 4 Requests und 3 sequentielle RTTs → 0.** Die Member-Liste steht im
ersten Paint. Nebeneffekte: die `loading`/`mounted`/`isRouteChanging`-Klammern
(`page.tsx:29,37,40,152-156`) entfallen, das `getDictionary`-Client-Import
entfällt, und der `LoadingSpinner`-Veil beim Dashboard-Start entfällt.

**Eigene PR-Empfehlung:** 5.3d ist der größte Einzelgewinn und der einzige
strukturelle Eingriff. Nicht mit 5.1/5.2 in denselben PR — 5.3a und 5.3c sind
zwei-Zeilen-Commits mit demselben Effekt.

### 5.4 `proxy.ts` setzt bei *jeder* Anfrage ein Cookie

`proxy.ts:71-81` schreibt `NEXT_LOCALE` bei **jedem** Request mit Locale im Pfad
— inklusive jeder RSC-Navigation. Ein `Set-Cookie` auf jeder Antwort bedeutet,
dass Next.js die Antwort nicht als statisch cachebar behandeln kann, und der
Browser schreibt jedes Mal in den Cookie-Store.

**Fix:** Nur setzen, wenn der Wert sich ändert:

```ts
if (matchedLocale) {
  const response = NextResponse.next();
  if (localeCookie?.value !== matchedLocale) {
    response.cookies.set({ /* … */ });
  }
  return response;
}
```

### 5.5 Service Worker: kein Gegenwert für den Preis

`public/sw.js`. Fünf Defekte — zwei davon waren in einer ersten Fassung dieses
Plans falsch dargestellt und sind hier korrigiert:

| Befund | Zeile | Beleg |
|---|---|---|
| `showInstallPrompt()` ruft `deferredPrompt.prompt()` **sofort** im `beforeinstallprompt`-Handler | `app/sw.ts:36-40` | Ein nativer Install-Dialog poppt **unaufgefordert** beim ersten Seitenaufruf. PRODUCT.md nennt „no download or install counts" als Abwesenheit — die App hat keine Install-UI |
| `CACHE_NAME` ist konstant; `activate` löscht nur *andere* Namen (`filter(n => n !== CACHE_NAME)`) | 1, 26 | Kein Pruning. Gemessen: **13 Einträge** nach einem Login, wächst mit jedem Deploy endlos |
| **Kein Push-Abo im ganzen Repo** | — | `pushManager` kommt **einmal** vor: `sw.js:100` selbst. Es wird nie `Notification.requestPermission` aufgerufen und nie `subscribe()`. Der `push`-Handler ist damit **unerreichbar** |
| `offline.html` existiert, wird aber von keiner UI verlinkt | `public/offline.html` | Kein Offline-Erlebnis, das den Handler rechtfertigt |
| `respondWith` für alle Same-Origin-GETs außer `/api/` — auch `/_next/static/chunks/*.js` | 40–58 | **Latenzargument entfällt — siehe unten.** Ein Wartungsproblem, kein Performance-Defekt |

> **Korrektur 1 — der Push-Handler wirft nicht.** Die WebIDL lautet
> `permissionState(optional PushPermissionDescriptor permissions)`. Ein
> Argument ist **legal**, der Aufruf wirft nicht. In einer früheren Fassung
> stand hier „`permissionState` nimmt keine Argumente → wirft"; das war falsch
> und stützte sich auf einen nicht geprüften Subagent-Bericht. Die zutreffende
> Aussage ist die oben: **nirgends wird ein Abo erzeugt**, der Handler feuert
> also nie. Verifizierbar per Grep, und das genügt.

> **Korrektur 2 — der HTTP-Cache wird nicht umgangen.** Die erste Fassung
> behauptete, der Worker „umgeht die HTTP-Cache-Semantik" und „erzwingt einen
> JS-Hop pro Navigation". Das ist **falsch**: `fetch()` im Service Worker läuft
> mit Cache-Mode `default` und wird weiterhin vom HTTP-Cache bedient;
> `/_next/static/chunks/*.js` sind `immutable, max-age=31536000` (Header
> setzt nur `next.config.js:8-13` für `/sw.js`). Und die gemessenen 347 ms
> Warm-Reload sind **nie A/B gegen „Worker abwesend"** verglichen worden. Eine
> Latenzzuschreibung gibt es damit nicht.

**Empfehlung: löschen — auf den tragfähigen Gründen.** `app/sw.ts`,
`public/sw.js`, `components/service-worker.tsx`, der `ServiceWorkerRegistration`-
Eintrag in `app/layout.tsx:143`, der `headers`-Block in
`next.config.js:5-17`, und `public/offline.html`.

Begründung ohne Latenz-Behauptung: Es gibt keine Offline-Geschichte im Produkt,
keine UI, die darauf verweist, und die SPEC nennt weder PWA-Install noch Push —
der Worker bietet also **nichts**, wofür sich der unaufgeforderte
Install-Dialog, der unbegrenzte Cache und der unerreichbare Push-Handler
rechtfertigen ließen. Solange es keine Offline-Anforderung gibt, ist ein
entfernter Service Worker die korrekte Implementierung — nicht eine schlecht
getunte Version davon.

> **Korrektur 3 — Löschen allein reicht nicht.** Ein 404 auf `/sw.js` entfernt
> nur den **Update-Pfad**. Der Update-Check des Browsers schlägt fehl, der alte
> Worker kontrolliert die Seite **weiter** — samt `gifthub-cache-v1` und dem
> `respondWith`-Handler. Die beabsichtigte Wirkung bliebe für **jede
> bestehende Installation** vollständig aus.
>
> **Pflicht-Schritt davor:** ein **Tombstone**-`sw.js` ausliefern, das im
> `install` die alten Caches löscht und `self.registration.unregister()` +
> `clients.claim()` aufruft. Erst im *Folge*-Deploy die Dateien entfernen. Ohne
> diesen Schritt ist das Ticket wirkungslos, und zwar unbemerkt.

**Falls Offline gewünscht ist** (als separates, begründetes Ticket): nur
`navigate`-Requests behandeln, `CACHE_NAME` versionieren, in `activate` die
eigene Cache-Version löschen, Install-Prompt entfernen, `push` entfernen.
Nicht beides in einem Commit.

### 5.6 Toast verdeckt die gesamte Navigation

`components/ui/sonner.tsx:12-18` setzt `position` auf `top-center` unter 640 px.
Gemessen:

```json
// bei 320 px UND bei 393 px, identisch
{ "toast": { "x": 16, "y": 16, "w": 288, "h": 54 },
  "header": { "y": 0, "h": 57 },
  "toastCoversHeader": true,
  "headerControlsCovered": ["logo", "language-switcher", "logout"] }
```

Der Toast liegt bei `y 16…70`, der Header bei `y 0…57`. **Er überdeckt
Logo, Sprachwechsel und Logout vollständig** — und **jede** Mutation des
Produkts löst einen Toast aus.

DESIGN.md's Begründung für `top-center` lautet: „so a toast never covers the
primary control on a phone". Das stimmt für die Buttons, gilt aber nicht für
den **Header**. Auf dem Dashboard ist der Header die einzige Navigation.

**Fix — Option A (empfohlen):** Toast unter den Header setzen, nicht über ihn.
Der Primitive braucht nur einen Offset:

```tsx
// ui/sonner.tsx – unter sm top-center mit top-Offset
mobileOffset={{ top: 'calc(var(--header-height) + 0.5rem)' }}
```

**Fix — Option B, größerer Hebel:** Nach 3e Erfolgstoasts abschaffen. Wenn
nur noch Fehler und Fremd-Ereignisse toasten, ist die Frequenz gering genug,
dass `top-center` ohne Header-Überdeckung funktioniert. **Beide kombinieren.**

> `(window.innerWidth >= 640)` wird nur einmal beim Mount gelesen
> (`sonner.tsx:16-18`). Nach einer Rotation auf einem Tablet bleibt die
> Position falsch. Bei der Umstellung auf `mobileOffset` mit einem
> Breakpoint-Objekt mitnehmen — Sonner löst Breakpoints selbst, dann
> entfällt der JS-Check komplett.

### 5.7 Safe Areas werden deklariert und nie benutzt

`app/layout.tsx:119` setzt `viewportFit: 'cover'`. Gemessen:

```json
{ "htmlPadding": "0px", "bodyPadding": "0px" }
```

Repo-weite Suche nach `env(safe-area-inset` → **null Treffer**. Der Wert wird
also deklariert, aber nirgends konsumiert. Auf einem Notch-iPhone liegt der
Inhalt damit unter der Statusleiste und der Home-Indicator liegt über dem
Footer — Letzterem direkt unter dem Footer-Zeilen „Datenschutz" / „AGB".

**Fix — in `@layer base` (`app/globals.css:167`):**

```css
html {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}
```

Dann an den vier Stellen, an denen es zählt — und **nicht** pauschal auf
`body`, sonst zählt es zur `container`-Padding-Chain aus §1 doppelt:

1. **`container`** — und zwar **am Ende** der Utility, nicht in der Basisregel:

   ```css
   @utility container {
     /* … bestehende Deklarationen inkl. der @media-Ladder … */

     /* Safe-Area muss NACH der Ladder kommen, sonst gewinnt bei 40rem/64rem
        das re-deklarierte padding-left/right (globals.css:446,456) und der
        Einsatz ist ab 640px wirkungslos — also genau dort, wo Querformat-
        Phones mit Lateral-Inset liegen (iPhone 12 ≈ 844px). */
     padding-inline: max(1rem, var(--sal)) var(--sar);
   }
   ```

   Die Basisregel (`:441-442`) allein zu ändern genügt **nicht**:
   `@utility container` deklariert `padding-left/right` in `@media (width >=
   40rem)` als `2rem` und ab `64rem` als `3.5rem` erneut. Eine spätere
   Deklaration derselben Spezifität gewinnt, deshalb der Platz hinter der
   Ladder.

2. `--header-offset: calc(var(--header-height) + var(--sat))`; Header
   (`header.tsx:80`) bekommt `min-h-header` + `padding-top: var(--sat)`
3. Dialog-Primitive (`ui/dialog.tsx:121-122`) — `xs:top` und `xs:max-h` von
   `--header-height` auf `--header-offset` umstellen, sonst sitzt das Sheet
   unter dem Header statt darunter
4. Footer (`footer.tsx:11`) —
   `padding-bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))`

### 5.8 `min-h-screen` statt `min-h-dvh` — der Footer liegt unter dem Fold

Gemessen (Pixel 5, ohne Browser-Chrome, also besten Falls):

```json
{ "innerHeight": 727, "docScrollHeight": 753, "footerBottom": 753,
  "bodyMinHeight": "727px", "dvhSupported": true }
```

`min-h-screen` = `min-height: 100vh`. Der Footer-Boden liegt **26 px unterhalb
des Viewports**, und der Codebase benutzt `100dvh` an anderer Stelle bereits
korrekt (`ui/dialog.tsx:121`). Auf einem echten Gerät ist der Abstand größer,
weil `100vh` zusätzlich die Browser-Chrome mitzählt.

Bei 320×568:

```json
{ "footerTop": 657, "realisticFold": 483,
  "needsScrollToReachFooter": true }
```

**Auf dem kleinsten Screen muss gescrollt werden, um Datenschutz und AGB zu
erreichen.** Das sind Links, die das Recht auf Auskunft tragen.

**Fix:** `min-h-screen` → `min-h-dvh` an drei Stellen:
`app/layout.tsx:130`, `app/[lang]/dashboard/page.tsx:159`,
`app/[lang]/page.tsx:53`.

### 5.9 `userScalable: false` — WCAG 1.4.4 (AA)

`app/layout.tsx:120`. iOS ignoriert das seit Safari 10, **Android Chrome
honoriert es**: Android-Nutzer können nicht pinch-zoomen.

**Fix:** `userScalable: false` entfernen.

**Vor dem Merge prüfen:** ob bei 200 % Zoom ein horizontaler Overflow
entsteht. `break-words` und `min-w-0` sind bereits an den Stellen gesetzt, an
denen lange deutsche/russische Namen umbrechen (`member-list.tsx:223`,
`gift-card.tsx:276`). Der Dialog nutzt `react-remove-scroll`
(`package.json:57-59`), was gegen Doppel-Pan abgesichert ist. Bei
Verbleib: `touch-action: pan-y` am Dialog-Primitive — aber erst messen, nicht
vorab.

### 5.10 Scrim: der verdeckte Inhalt ist dunkler als der Dialoginhalt

Gemessen bei geöffnetem Dialog:

```json
{ "scrimBg": "oklab(0.146857 … / 0.55)",
  "underlyingMemberNameColor": "rgb(34, 27, 22)",
  "sheetDescriptionColor": "rgb(113, 101, 91)" }
```

DESIGN.md: *"The board behind stays legible and recedes."* Legibel ist er.
**Er setzt sich nicht zurück** — der Member-Name hinter dem Scrim steht auf
`rgb(34,27,22)`, der Beschreibungstext **im** Dialog auf `rgb(113,101,91)`.
Was der Dialog zurückstufen soll, ist dunkler und schwerer als der Dialog
selbst. Auf einem Phone, wo beides gleichzeitig im selben Viewport ist,
ist das eine umgekehrte Hierarchie.

**Fix:** `bg-scrim/55` → `bg-scrim/75` in `ui/dialog.tsx:27`. `--scrim` ist
per Theme deklariert (`globals.css:298,340`), wird also in **beiden** Themes
richtig dunkler — das ist genau der Fall, für den der Token existiert.

**Vorher messen, nicht setzen:** Die konstruierte Regel in DESIGN.md ist,
dass der Scrim *nicht* das einzige Signal ist, das den Dialog abgrenzt — es
gibt auch den 1-px-Rule und den einzigen Shadow. Bei `/75` muss die Rule
gegen `--scrim` bei 75 % noch sichtbar bleiben. Auf dem Sheet gegen den
Board messen, in beiden Themes.

### 5.11 `FooterLinks` behält nach Sprachwechsel die alte Locale

`components/footer-links.tsx:22`:

```ts
const currentLanguage = getCurrentLanguage(path);
const [lang] = useState(currentLanguage.code);   // ← einmal, danach nie wieder
```

`lang` wird beim ersten Render eingefroren. Nach dem Sprachwechsel zeigen die
Footer-Links weiter auf `/{alteLocale}/privacy`.

**Fix:** Den State entfernen und direkt rendern:

```diff
- const [lang] = useState(currentLanguage.code);
  return (
    <div …>
-     <Link href={`/${lang}/privacy`} …>
+     <Link href={`/${currentLanguage.code}/privacy`} …>
```

---

## 6. Reihenfolge

Fünf Phasen. Jede Phase ist für sich shippbar und für sich messbar; die
Acceptance-Kriterien stehen jeweils im zugehörigen Abschnitt.

| Phase | Inhalt | Risiko | Hebel |
|---|---|---|---|
| **0** ✅ | Auth-Guard: `proxy.ts` prüft `/{locale}/dashboard`, `page.tsx` testet `auth.success` | erledigt | **Dauer-Spinner → Redirect** |
| **1** | §1e Member-Zeile volle Klickfläche, §2 Modal-Öffnung + Skeleton, §2e Duplicate-Fetch, §3 Optimistic UI (add + toggle + delete), §4 Touch Targets | mittel — §3 berührt die Sektionslogik des Sheets | **−850 ms** auf den drei Kerninteraktionen; 7 Targets auf 44 px |
| **2** | §5.3a parallelisieren, §5.3b Header-Effect, §5.3c `loadTranslations` raus, §5.4 Proxy-Cookie | niedrig — 2-Zeilen-Commits | **−2 Roundtrips** pro Navigation |
| **3** | §5.1 `groupId` ins JWT, §5.6 Toast, §5.7 Safe Areas, §5.8 `dvh`, §5.9 `userScalable`, §5.10 Scrim, §5.11 Footer-Links | mittel — Auth-Cookie-Handling, deshalb mit Fallback | **−1 DB-Hop** pro Request; Navigation bleibt sichtbar; Zoom funktioniert |
| **4** | §5.5 Service Worker: **Tombstone** ausliefern, dann erst löschen · §5.2 bcrypt entfernen (Prisma-Migration) | mittel bzw. niedrig | überflüssige Krypto-Arbeit pro „Mitglied hinzufügen"; unbegrenzter Cache und unaufgeforderter Install-Dialog entfallen |
| **5** | §5.3d Dashboard als Server Component | **hoch** — Strukturwechsel | **4 RTTs → 0**, Liste im ersten Paint |

**Phase 4 hat eine Reihenfolge innerhalb sich:** das Tombstone-`sw.js` muss
**vor** dem Löschen ausgeliefert werden, sonst bleibt der alte Worker bei
bestehenden Installationen aktiv und die Änderung ist wirkungslos (§5.5).

**Empfehlung:** Phase 1 und 3 zusammen sind der größte Wert pro Risiko.
Phase 4 vor 5, weil Phase 5 sonst gegen die alte Datenlage gebaut wird.
Phase 5 als eigener PR mit Review-Fokus auf der Server/Client-Grenze.
Die Phasen 1 und 5 sind die einzigen, die strukturell in die Sheet-Logik
eingreifen — **nicht** parallelisieren.

### Was in Phase 5 aufpassen muss

- Die Redirect-Logik wandert von einem Client-`useEffect` (`page.tsx:92-95`,
  `router.replace`) zu einem Server-`redirect()`. Das ist besser — kein
  Spinner-Flash vor dem Zurückleiten.

  > **Korrektur — es gab keinen Backstop.** Eine frühere Fassung dieses Plans
  > schrieb hier, `proxy.ts:41-59` schütze `/dashboard` bereits. Das war
  > **falsch**: der Guard testete `pathname.startsWith('/dashboard')`, und die
  > einzige Dashboard-Route ist `/{locale}/dashboard`. Er feuerte nie. Der
  > Client-Check war ebenfalls tot (`if (!auth)` — `verifyAuth()` gibt immer
  > ein Objekt zurück, auch `{ success: false }`). **Das Dashboard hatte damit
  > keinen Auth-Gate; unauthentifiziert bekam man einen endlosen Spinner.**
  >
  > **Beide Stellen sind inzwischen behoben** (Hotfix vor diesem Review,
  > verifiziert: gültiger Token → 200 in de/en/ru, ohne/kaputter Token → 307,
  > 50/50 e2e-Tests grün). Für Phase 5 heißt das: Der Server-`redirect()` wird
  > das **einzige** Gate, **fail-closed** in dieser Reihenfolge — Signatur
  > prüfen → Gruppe auflösen → bei *jedem* Fehler `redirect()`. Die Client-Seite
  > bleibt als reine UX (Toast) und darf nie die Autorisierung tragen.

- `getSelectedMember()` (`page.tsx:135-136`) ist `members.find(m => m.id === selectedMemberId)`
  — eine **ID**-Suche, keine Namensauflösung, und `members` ist bereits heute
  Client-State (`page.tsx:33`). An ihr ändert 5.3d **nichts**; sie wandert
  lediglich mit in den Client-Schild.
- `MemberGiftsDialogProps` (`types.ts:233-251`) verlangt **kein** `lang`.
  Der Vertrag ist heute rein `dict`-basiert
  (`isOpen, onClose, memberName, memberId, gifts, onGiftAdded, dict`), und
  `member-gifts-dialog.tsx` importiert **gar keinen** Dictionary-Loader.
  Die echte Constraint für 5.3d ist also: dasselbe fertige `dict`-Objekt vom
  Server durchreichen und **keinen** `lang`-getriggerten Client-Reload
  einführen.

### Was ausdrücklich nicht geändert wird

- **Die Höhe der Member-Zeile (112 px).** §1e macht die Zeile **breiter**
  klickbar, nicht flacher: `py-5` bleibt, `min-h-[72px]` bleibt, damit der
  von DESIGN.md gemessene Rhythmus unangetastet bleibt. `py-5` → `py-4` ist
  weiterhin **nicht** Teil dieses Plans.
- **Die Landingpage.** Sie hat das Padding-Problem bereits gelöst
  (`padding-left: 0px` gemessen) und ist die Referenz, nicht der Befund.
- **`collect-settle`, `count-flash`, `reveal-in`.** Die drei authored
  Momente bleiben. Das Skeleton in 2b ist ausdrücklich **ohne** Animation.
- **Der Dialog-Mechanismus des Sheets.** Gemessen korrekt: bei 320×568
  `height: 368`, `maxHeight: 496px`, `top: 57px`, `padding: 16px`, Dialogboden
  58 px über dem realistischen Fold. Die Geometrie stimmt — der Defekt ist
  die Wartezeit davor, nicht das Sheet.
- **Das `collect-settle`-Gating.** `changedId` ist bereits korrekt gegen
  Wiedergabe beim Öffnen abgesichert.

---

## 7. Test-Infrastruktur

`playwright.config.ts:43-50` fährt bereits **Pixel 5** und **iPhone 12** mit.
Die vorhandenen Specs nutzen großzügige Timeouts und messen **keine** Zeit —
`tests/dashboard.spec.ts:140` schlägt sogar `waitForTimeout(1000)` fest. Es
gibt also keinen Regressionsschutz für genau das, was hier geändert wird.

Drei Ergänzungen, alle in `tests/`:

**7a — Touch-Target-Wächter (`tests/touch-targets.spec.ts`).**
Über alle Routen, de/en/ru, Light/Dark: jedes sichtbare interaktive Element
messen und unter 44 px fehlschlagen. Das ist der Test, der die 5 Verstöße aus
§4 dauerhaft verhindert und den Drift aus 4f unabhängig vom Menschenmechanismus
fängt. Skip-Liste nur für Elemente mit bewusstem `data-allow-small-target`,
damit sie nicht still wächst.

**Zwei Messregeln, sonst ist der Wächter nutzlos:**

1. **Nicht nur Border-Box messen.** `getBoundingClientRect()` liefert die
   Border-Box des Elements. Eine Trefferfläche, die über `::before` oder
   `::after` hinausreicht, ist damit **prinzipiell nicht messbar** — der Test
   würde sie als zu klein melden und den Implementierer dazu drängen, die
   sichtbare Box zu vergrößern. §4b ist genau deshalb so umgesetzt, dass der
   **Button selbst** auf 44 px wächst: dann stimmen Border-Box und Trefferbox.
2. **Zusätzlich `document.elementFromPoint` an den vier Ecken.** Damit wird die
   *tatsächliche* Trefferfläche geprüft und nicht die deklarierte. Ein Element,
   das per Overlay oder `::after` vergrößert wird, fällt durch die
   Border-Box-Messung, besteht aber `elementFromPoint` — genau die Differenz,
   die ein reiner Rect-Test übersieht.

**7b — Latenz-Budgets (`tests/latency.spec.ts`).**
Mit `page.clock` bzw. CDP-Throttling die vier Schwellen aus §2/§3 festnageln:
Dialog-Shell < 100 ms, Toggle-Invertierung < 100 ms, Add-Zelle < 100 ms,
Mutation = 1 Request. Der Test muss unter CI-Verhältnissen tragefähig bleiben
— deshalb Schwellen auf das *Verhältnis* von Feedback zu Netzwerk setzen
(„Feedback erscheint vor der Antwort"), nicht auf absolute Millisekunden.

**7c — Erweiterung von `dashboard.spec.ts`.**
Die existierende Spec deckt den Happy Path bereits vollständig ab. Ergänzt
werden muss nur: **kein** `LoadingSpinner` während des Modal-Öffnens, und ein
Tipp-Zyklus, der beweist, dass ein zweiter Tipp keinen zweiten Request erzeugt.

### Regressionstest für die Phasen, die Daten ändern

Phase 4 (bcrypt) und Phase 5 (Server Component) brauchen zusätzlich einen
manuellen Pass, den kein Test ersetzt: **auf einem echten Gerät** (ein günstiges
Android genügt — `adapt.md:308` sagt das ausdrücklich), in de/en/ru, hell und
dunkel. Die 44-px-Zusage und die `min-h`/`dvh`/`env()`-Änderungen sind genau
die Klasse von Defekt, die DevTools-Emulation zuverlässig überschätzt.

---

## 8. Copy

PRODUCT.md: *"A new string is un-done until it exists in de, en and ru."*

**Für die Phasen 1–5 ist fast keine neue Copy nötig.** Das ist Absicht, kein
Versehen — die Latenz-Fixes arbeiten mit dem, was schon da ist:

| Bedarf | Status |
|---|---|
| „Wird hinzugefügt…" am Submit | `memberGifts.adding` — **existiert** in de/en/ru |
| Optimistische Zelle mit `aria-busy` | braucht **keinen** Text |
| Skeleton-Zellen | brauchen **keinen** Text (gleiche `SectionHead`, Zähler `00`) |
| Erfolgstoast nach Toggle | **entfällt** in 3e — die Zelle ist die Bestätigung |

**Eine echte Neuerung**, falls eine `aria-live`-Ansage für den Pending-Zustand
gewollt ist: eine Zeile wie `memberGifts.saving` in `lib/translations/{de,en,ru}.json`.
Dann aber in **allen drei** gleichzeitig, sonst ist der Flow für russische
Nutzer unvollständig — und das ist in diesem Projekt kein Detail, sondern die
halbe Zielgruppe.

Ohne Live-Region sind alle Optimierungen vollständig funktionsfähig; die
Live-Region ist eine Accessibility-Ergänzung, keine Voraussetzung. **Empfehlung:
erst ohne, messen, dann entscheiden.**

---

## 9. Audit-Score

Bewertet nach `reference/audit.md`, 0–4 je Dimension.

| # | Dimension | Score | Kernbefund |
|---|---|---|---|
| 1 | Accessibility | **2** | `userScalable: false` verletzt WCAG 1.4.4 (AA); Safe Areas fehlen trotz `viewportFit: 'cover'`; Toast verdeckt die gesamte Navigation; 5 Elemente unter der eigenen 44-px-Zusage. Dagegen: Formular-Labels, `aria-pressed` vorhanden, Fokusmechanismus app-weit, Collected-State in Graustufen lesbar. |
| 2 | Performance | **1** | 306 ms tote Zone beim Modal, 903 ms bis zur Invertierung beim Kernmoment, 11,2 s bis zur Member-Liste auf Slow 4G, doppelte Requests, `backdrop-blur` über die volle Viewport-Fläche. (Der Service Worker ist kein Latenzfaktor — der HTTP-Cache greift auch hinter ihm; er ist ein Wartungsproblem, §5.5.) |
| 3 | Responsive Design | **2** | 52-px-Padding-Kette auf dem Dashboard gegen 16 px im Header, 2 von 3 Mitgliedern über dem Fold bei 320×568, Footer unter dem Fold, kein `dvh`. **Kernstärke:** das responsive Denken selbst ist gut — `xs:`-Ladder, `clamp()`, `text-balance`, `break-words` an den richtigen Stellen, `min-h-11` + `stretch` statt fixer Höhe. |
| 4 | Theming | **3** | Vollständige Token-Abdeckung, beide Themes, `--scrim` und `--collected` korrekt theme-relativ. 11 Detector-Advisories (Type-Ramp-Abweichungen) + 1 Farbe außerhalb der Palette. |
| 5 | Implementation Integrity | **3** | Detector: **0 Anti-Patterns.** Aber: toter Auth-Guard am Dashboard (**seit dem Hotfix behoben**), unerreichbarer Push-Handler (nirgends ein Abo), unaufgeforderter Install-Prompt, eingefrorener Locale-State im Footer, `isRouteChanging` als toter State. |
| | **Summe** | **11 / 20** | **Acceptable** — erhebliche Arbeit nötig, aber auf einer intakten Basis |

### Implementation-Integrity-Verdict: **Pass**

Die Codebasis drückt ein kohärentes, produktspezifisches System aus. Kein
einziger Fund ist austauschbar mit einem fremden Produkt: die Inversion der
Zelle, das geteilte Bought-Flag, `SectionHead` mit `00`-Zähler, die leere
Sheet als Add-Control, der Member-Ink-Hash. Der Detector meldet null
Anti-Patterns.

Die gefundenen Defekte sind **Leistungs- und Sorgfaltsprobleme innerhalb** dieses
Systems, nicht Design-Drift. Genau deshalb ist der Plan in Phasen geschnitten:
Er erhält die Welt, er repariert, wie lange sie zum Reagieren braucht.

---

## 10. Was bereits richtig ist

Das gehört festgehalten, weil Phase 1–5 leicht als Umbau missverstanden
werden. Diese Dinge sind **gemessen** korrekt und dürfen nicht mitgerissen
werden:

- **Die zwei wichtigsten Controls haben 44 px.** `giftStrikethrough` und
  `giftDelete` messen beide 44 × 44, mit `min-h-11` + `stretch` statt fixer
  Höhe — das `min-h`-statt-`h`-Muster ist eine bewusste, dokumentierte
  Reparatur und muss bleiben.
- **Die Dialog-Geometrie stimmt.** Bei 320×568: `height: 368`,
  `maxHeight: 496px` (= `100dvh − header − 1rem`, korrekt gerechnet), `top: 57px`,
  Dialogboden 58 px über dem realistischen Fold. Kein Void, kein
  Over-Constraint.
- **Das Feedback im Add-Form existiert bereits.** Der Submit relabelt sich
  synchron auf `dict.adding`. Es ist nicht dark-pattern-blind — es wartet nur
  auf das, was danach kommt.
- **Der Sheet-Empty-State ist der Add-Control.** Die Blank Plate ist ein
  `<button>` über die volle Cell-Breite (359 × 158.9 gemessen) statt eines
  Geister-Rows. Richtig, und in 3c nicht anzutasten.
- **`break-words` + `min-w-0` sitzen genau dort, wo lange deutsche/russische
  Namen umbrechen** (`member-list.tsx:223`, `gift-card.tsx:276`,
  `landing-preview.tsx:110`). `docScrollWidth == innerWidth` gemessen auf allen
  drei Breiten — **kein horizontaler Overflow**.
- **Der Fokusmechanismus ist app-weit und zweitonig** in `@layer base` —
  ein Mechanismus, kein zweiter Ring pro Komponente.
- **Cyrillic-Subsets** sind in allen drei `next/font`-Aufrufen geladen.
- **Der Hover ist korrekt auf echten Pointer geatchet**
  (`[@media(hover:hover)_and_(pointer:fine)]:`) — das ist der Bug, der in den
  meisten Tailwind-Codebasen steht, und er steht hier nicht.
- **Die Sheet-Höhe ist nicht mehr über-constraints** (`ui/dialog.tsx:106-121`)
  — der dokumentierte `xs:top`/`xs:bottom-0`-Fall ist behoben.

---

## 11. Reproduktion

Alle Zahlen in diesem Dokument sind mit Chromium erzeugt, gegen den lokalen
Dev-Server (`next dev -p 3000`, `.env.local` → Neon `local-dev`, Seed-Gruppe
`testgroup` / `test123`).

```bash
# Umgebung wie in der Repo-Konvention: node via nvm unter Git Bash
source ~/.nvm/nvm.sh
cd /d/GitHub/wishy

npx tsc --noEmit          # Baseline vor und nach jeder Phase

# Viewports: Pixel 5, iPhone 12, 320x568
npx playwright test tests/dashboard.spec.ts --project="Mobile Chrome"

# 4G-Throttling + CPU-Throttling für die Latenzzahlen aus §2/§3
# (CDP: Network.emulateNetworkConditions 1.6Mbps/150ms,
#       Emulation.setCPUThrottlingRate 4)
```

Alle Mess-Skripte lagen unter
`C:\Users\andre\AppData\Local\Temp\kilo\` und wurden **nicht** ins Repo
geschrieben; der Working Tree enthält ausschließlich dieses Dokument.

**Basislinie vor dem Umbau:** `npx tsc --noEmit` → Exit 0.

**Falls Port 3000 nach einem Abbruch blockiert ist:**

```bash
netstat -ano | findstr :3000     # PID ermitteln
taskkill /PID <pid> /F /T        # /T = ganze Prozesskette
```

Ein verwaister Next-Dev-Server hält nach einem Session-Abbruch den Port im
`Listen`-State, antwortet aber nicht mehr — dann liefert `npm run dev`
`EADDRINUSE`, während gleichzeitig kein Server erreichbar ist.

---

## Anhang A: Rohmesswerte

<details>
<summary>Alle Messungen, unverarbeitet</summary>

```
=== GEOMETRIE (unthrottled, warme DB) ===
Pixel 5 (393x727) · iPhone 12 (390x664) · 320x568 — identisch:
  container padLeft ............ 16px
  innerCol padLeft ............. 16px   (py 32px)
  sheet padLeft ................ 20px   (py 24px)
  memberNameLeft ............... 53px
  header padLeft ............... 16px
  docScrollWidth == innerWidth (kein Overflow)
  member row tops .............. 282 / 395 / 508   (pitch 113px)

Landingpage zum Vergleich:
  innerCol padLeft ............. 0px    <- Fix dort bereits angekommen
  sheet padLeft ................ 0px

=== TOUCH TARGETS ===
Pixel 5 dashboard .... 7 von 11 unter 44px
Pixel 5 gifts sheet .. 7 von 13 unter 44px
320px   dashboard .... 7 von 11 unter 44px
Pixel 5 landing ..... 5 von 6  unter 44px

  a[logo] .................... 128.97 x 32      (96.25 x 32 landing)
  button[language-switcher] .. 36 x 36
  [role=menuitem] x3 ......... 150 x 42.5      Deutsch/English/Русский
  a[linkPrivacy] ............. 78.98 x 19.5
  a[linkTerms] ............... 26.33 x 19.5
  addGiftSubmit .............. 359 x 44         (soll 48)
  confirmAction .............. 44 hoch          (soll 48)

  -- konform --
  giftStrikethrough ......... 44 x 44
  giftDelete ................ 44 x 44
  dialogClose ............... 44 x 44
  showGiftsDialog ........... 182.6 x 72
  addGiftButton (Blank Plate) 359 x 158.9
  showRemoveMemberButtons ... 287 x 44
  addMemberButton ........... 287 x 44
  logout .................... 108.1 x 44
  addGiftSubmit / Abbrechen . 359 x 44

=== BOOT (unthrottled, localhost) ===
  GET /api/auth/verify       +313ms   x2  (StrictMode-Dev-Artefakt)
  POST /api/auth/login       +2427ms
  GET /de/dashboard?_rsc=    +2535ms
  GET /api/auth/verify       +2656ms   x2  (StrictMode-Dev-Artefakt)
  GET /api/members           +2671ms
  GET /api/gifts             +2740ms         <- sequentiell nach members
  GET /api/auth/verify       +2807ms   x2  (StrictMode-Dev-Artefakt)
  -> memberList sichtbar: 4039ms, 9 API-Calls

=== THROTTLED: Slow 4G (1.6 Mbps / 150ms) + 4x CPU ===
  landing DOM ready .............. 1362ms
  -> Member-Liste gerendert ...... 11209ms
  API-Calls ..................... 9

  MODAL-OEFFNUNG (Tipp auf Gruppenname)
    click -> erste Aenderung ..... 306ms   (Dialog)
    click -> Dialog sichtbar ..... 344ms
    Zellen auf Screen ........... 0
    Requests .................... 1

  GESCHENK HINZUFUEGEN (Submit)
    Label im naechsten Frame ..... "Wird hinzugefuegt..."
    Text auf Tap geaendert ....... true
    Tap -> neue Zelle sichtbar ... 878ms
    Requests .................... 3   (POST + 2x identischer GET)

  ALS GEKAUFT MARKIEREN
    background vor .............. rgb(253, 253, 252)
    Invertierung bei ............ 903ms nach dem Frame nach dem Tipp
    Requests .................... 3   (PUT + 2x identischer GET)

=== SAFE AREA / VIEWPORT ===
  htmlPadding ................... 0px
  bodyPadding ................... 0px
  bodyMinHeight ................. 727px   (100vh)
  dvhSupported ................... true   (aber ungenutzt)
  innerHeight ................... 727
  footerBottom ................... 753    <- 26px UNTERHALB des Viewports
  docScrollHeight ................ 753

  320x568:
    realistischer Fold (85%) ..... 483
    Member-Zeilen ................ 282 ok / 395 ok / 508 nicht
    sichtbare Mitglieder .......... 2 von 3
    footerTop .................... 657  -> Scroll noetig fuer Datenschutz/AGB

=== DIALOG (320x568) ===
  height 368 · width 320 · maxHeight 496px · top 57px
  padding 16px · overflowY auto
  headerHeight 56px · Dialogboden 58px ueber realistischem Fold  OK

=== TOAST vs HEADER (320px und 393px, identisch) ===
  toast  x16  y16  w288(320px)/361(393px)  h54
  header y0   h57
  toastCoversHeader ...... true
  verdeckt .............. logo, language-switcher, logout

=== SCRIM ===
  scrimBg ...................... oklab(0.146857 0.00426819 0.00753101 / 0.55)
  MemberName hinter Scrim ...... rgb(34, 27, 22)
  Dialog-Beschreibung ......... rgb(113, 101, 91)
  -> verdeckter Inhalt ist DUNKELER als der Dialoginhalt

=== SERVICE WORKER ===
  registrations 1 · scope / · active true
  cacheNames ["gifthub-cache-v1"] · cachedEntries 13
  Warm-Reload bis Member-Liste .. 347ms (unthrottled)
```

</details>

---

## Anhang B: Detector-Output

```
$ impeccable detect app components lib
0 anti-patterns found.

-- Advisory (nicht als Fehler gewertet) --
app/[lang]/page.tsx:148               [design-system-font-size] 1.0625rem off ramp
app/globals.css:279                   [design-system-radius]    999px outside scale
app/globals.css:480                   [design-system-font-size] 1rem off ramp
app/layout.tsx:115                    [design-system-color]     #100C09 outside palette
components/add-member-dialog.tsx:220  [design-system-font-size] 0.875rem off ramp
components/add-member-form.tsx:41     [design-system-font-size] 0.875rem off ramp
components/feature-card.tsx:33        [design-system-font-size] 1.375rem off ramp
components/feature-card.tsx:42        [design-system-font-size] 1rem off ramp
components/landing-preview.tsx:72     [design-system-font-size] 1.375rem off ramp
components/member-list-header.tsx:68  [design-system-font-size] 0.875rem off ramp
components/ui/button.tsx:51           [design-system-font-size] 0.875rem off ramp

11 advisory notes.
```

Alle 11 sind Type-Ramp-Abweichungen (0.875rem ist eine reale, genutzte
Zwischenstufe in drei Komponenten) und eine Palette-Ausnahme für die
Dark-Mode-`themeColor`. **Kein einziger ist ein Latenz- oder
Touch-Defekt** — der Detector findet in diesem Projekt keinen der Befunde
dieses Audits, weil er nach Anti-Patterns sucht und nicht nach Latenz. Das
ist kein Fehler des Detectors, sondern der Grund, warum dieser Audit
manuell und messend stattfinden musste.