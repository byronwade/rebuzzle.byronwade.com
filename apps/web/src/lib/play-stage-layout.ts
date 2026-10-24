/**
 * When the play stage should become a single page scroller instead of a
 * pinned column with an inner chat scroller.
 *
 * Locked days and an expanded mobile puzzle both need the thread to sit in
 * document flow so growing content pushes chats down instead of painting over them.
 */
export function isPlayStageScrollable({
  gameOver,
  stageExpanded,
  keyboardOpen,
}: {
  gameOver: boolean;
  stageExpanded: boolean;
  keyboardOpen: boolean;
}): boolean {
  return (gameOver || stageExpanded) && !keyboardOpen;
}
