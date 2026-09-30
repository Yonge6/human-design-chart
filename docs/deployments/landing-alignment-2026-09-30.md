# Landing alignment

- Source bc905802051ca4d97bc5f17d5dc2c52149f2499a; artifact 5a420b2. Rollback artifact af40600.
- Follow-up to equal-height landing cards: public inspection found equal 640px heights but Home started at y=88 versus y=120 for Growth and Me. Added 32px desktop / 24px mobile Home padding, scoped to the empty-conversation landing state.
- Local browser measured all three at top=120, bottom=760, height=640 at 1347px; top=96, bottom=696, height=600 at 390px. Public UI tests passed (27).
- Earlier cumulative changes include removal of personal-space home heading, six themed icons with 20px actual text gap, and 100 bilingual welcome lines with immediate-repeat exclusion. Long-line tests covered all 200 strings at 320/761/1063/1347px without overflow.
