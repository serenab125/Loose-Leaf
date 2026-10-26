
import { useState } from 'react';
import styles from './QuizQuestion.module.css';

export function QuizQuestion({ section, answer, onAnswer, number }) {
  const [showAll, setShowAll] = useState(false);

  const isMultiSelect = section.type === 'multi-select';
  const currentAnswer = answer?.[section.id];

  const selectedValues = Array.isArray(currentAnswer)
    ? currentAnswer
    : [];

  const isSelected = (optionId) =>
    isMultiSelect
      ? selectedValues.includes(optionId)
      : currentAnswer === optionId;

  const handleSelect = (optionId) => {
    if (!isMultiSelect) {
      onAnswer(section.id, optionId);
      return;
    }

    // Exclusive choices clear other selections.
    const exclusiveIds = ['not-sure', 'everything', 'surprise'];

    if (exclusiveIds.includes(optionId)) {
      onAnswer(
        section.id,
        selectedValues.includes(optionId) ? [] : [optionId]
      );
      return;
    }

    const filtered = selectedValues.filter(
      (id) => !exclusiveIds.includes(id)
    );

    const updated = filtered.includes(optionId)
      ? filtered.filter((id) => id !== optionId)
      : [...filtered, optionId];

    onAnswer(section.id, updated);
  };

  const pillStyle = isMultiSelect;
  const colorStyle = section.style === 'olive' ? 'olive' : 'pink';

  // Show a limited number of options until expanded.
  const visibleLimit = section.initialVisible;
  const hasMoreOptions =
    Number.isInteger(visibleLimit) &&
    section.options.length > visibleLimit;

  const visibleOptions =
    hasMoreOptions && !showAll
      ? section.options.slice(0, visibleLimit)
      : section.options;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionLabel}>
          <span
            className={`${styles.number} ${number % 2 === 0
                ? styles.pinkNumber
                : styles.greenNumber
              }`}
          >
            {number}
          </span>

          <span className={styles.sectionTitle}>
            {section.title}
          </span>
        </div>

        {isMultiSelect && (
          <span className={styles.multiBadge}>
            Pick as many
          </span>
        )}
      </div>

      <h2 className={styles.questionText}>
        {section.question}
      </h2>

      {section.instructions && (
        <p className={styles.instructions}>
          {section.instructions}
        </p>
      )}

      <div
        className={
          pillStyle ? styles.pillGrid : styles.optionsGrid
        }
      >
        {visibleOptions.map((option) => {
          const selected = isSelected(option.id);

          return (
            <label
              key={option.id}
              className={[
                pillStyle ? styles.pill : styles.optionRow,
                selected
                  ? colorStyle === 'olive'
                    ? styles.selectedOlive
                    : styles.selectedPink
                  : '',
              ].join(' ')}
            >
              <input
                type={pillStyle ? 'checkbox' : 'radio'}
                name={`quiz-${section.id}`}
                value={option.id}
                checked={selected}
                onChange={() => handleSelect(option.id)}
                className={styles.radioInput}
              />

              {!pillStyle && (
                <span className={styles.optionCheck} />
              )}

              <span className={styles.optionContent}>
                <span className={styles.optionTitle}>
                  {option.label}
                </span>

                {option.subtitle && (
                  <span className={styles.optionSubtitle}>
                    {option.subtitle}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {hasMoreOptions && (
        <button
          type="button"
          className={styles.showMoreButton}
          onClick={() => setShowAll((previous) => !previous)}
        >
          {showAll
            ? 'Show less ↑'
            : `Show more (${section.options.length - visibleLimit} more) ↓`}
        </button>
      )}
    </section>
  );
}
