# Mobile picker presentation

- Source 4510bd5c0407a052c8a90202c5cb1f546c912407; artifact 9214f85; rollback 5bb6ae5.
- Mobile date/time fields retain real native inputs and validation, overlaid transparently within a bounded 58px rounded shell. Existing localized display spans provide placeholders and selected values, with calendar/clock affordances. Desktop controls remain native and visually unchanged.
- Removed visual collision between earlier visible-input overrides and the mobile display-layer rules through scoped form selectors. Padding and borders are box-sized inside the container; focus outlines remain visible.
- 27 public UI tests passed. Browser checks at 320/390/500px showed no horizontal overflow; date 1986-06-30 and time 13:50 synchronized to the display and underlying values; English date format also checked.
- Actual iOS WeChat picker panel is not reproduced by desktop emulation; device confirmation remains necessary. No date conversion or birth-time calculation logic changed.
