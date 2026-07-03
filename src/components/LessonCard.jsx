function LessonCard({ lesson }) {
  const isClickable = Boolean(lesson.exerciseListUrl);

  function handleOpenExerciseList() {
    if (!lesson.exerciseListUrl) {
      return;
    }

    window.open(lesson.exerciseListUrl, "_blank", "noopener,noreferrer");
  }

  function handleKeyDown(event) {
    if (!isClickable) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenExerciseList();
    }
  }

  return (
    <article
      className={`lesson-card${lesson.isNewestReleased ? " is-featured" : ""}${isClickable ? " is-clickable" : " is-disabled"}`}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : -1}
      onClick={handleOpenExerciseList}
      onKeyDown={handleKeyDown}
    >
      <div className="lesson-card-top">
        <span className="lesson-week">{lesson.moduleLabel}</span>
        <span className={`lesson-status${lesson.isReleased ? " is-open" : ""}`}>
          {lesson.statusLabel}
        </span>
      </div>

      <h3>{lesson.publicTitle}</h3>
      <p>{lesson.publicDescription}</p>
      <p className="lesson-note">{lesson.teacherNote}</p>

      <div className="lesson-meta">
        <span>{lesson.area}</span>
        <span>{lesson.availabilityLabel}</span>
      </div>

      <span className={`lesson-action${isClickable ? "" : " is-muted"}`}>
        {isClickable ? "Baixar lista de exercícios" : "Lista de exercícios em breve"}
      </span>
    </article>
  );
}

export default LessonCard;
