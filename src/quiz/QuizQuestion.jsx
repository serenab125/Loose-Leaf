import { useState } from 'react';
import styles from './QuizQuestion.module.css';

export function QuizQuestion({ section, answer, onAnswer, number }) {
  const [showAll, setShowAll] = useState(false);
  const [otherDraft, setOtherDraft] = useState('');

  const isMultiSelect = section.type === 'multi-select';
  const currentAnswer = answer?.[section.id];
  const otherKey = `${section.id}-other`;
  const customEntries = Array.isArray(answer?.[otherKey])
    ? answer[otherKey]
    : [];

  const selectedValues = Array.isArray(currentAnswer)
    ? currentAnswer
    : [];

  const isSelected = (optionId) =>
    isMultiSelect
      ? selectedValues.includes(optionId)
      : currentAnswer === optionId;

  const isOtherSelected = section.allowOther && selectedValues.includes('other');

  const handleSelect = (optionId) => {
    if (!isMultiSelect) {
      onAnswer(section.id, optionId);
      return;
    }

    // Exclusive choices clear other selections (including custom "Other" text).
    const exclusiveIds = ['not-sure', 'everything', 'surprise'];

    if (exclusiveIds.includes(optionId)) {
      const nextSelected = selectedValues.includes(optionId) ? [] : [optionId];
      onAnswer(section.id, nextSelected);
      if (section.allowOther && customEntries.length > 0) {
        onAnswer(otherKey, []);
      }
      setOtherDraft('');
      return;
    }

    const filtered = selectedValues.filter(
      (id) => !exclusiveIds.includes(id)
    );

    const removingOther = optionId === 'other' && filtered.includes('other');
    const updated = filtered.includes(optionId)
      ? filtered.filter((id) => id !== optionId)
      : [...filtered, optionId];

    onAnswer(section.id, updated);

    if (removingOther) {
      onAnswer(otherKey, []);
      setOtherDraft('');
    }
  };

  const handleAddCustomEntry = () => {
    const trimmed = otherDraft.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    const alreadyExists = customEntries.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );

    if (!alreadyExists) {
      onAnswer(otherKey, [...customEntries, trimmed]);
    }

    if (!selectedValues.includes('other')) {
      const filtered = selectedValues.filter(
        (id) => !['not-sure', 'everything', 'surprise'].includes(id)
      );
      onAnswer(section.id, [...filtered, 'other']);
    }

    setOtherDraft('');
  };

  const handleRemoveCustomEntry = (entryToRemove) => {
    const remaining = customEntries.filter((item) => item !== entryToRemove);
    onAnswer(otherKey, remaining);
  };

  const pillStyle = isMultiSelect;
  const colorStyle = section.style === 'olive' ? 'olive' : 'pink';

  // Show a limited number of options until expanded, while always keeping "Other" accessible.
  const visibleLimit = section.initialVisible;
  const hasMoreOptions =
    Number.isInteger(visibleLimit) &&
    section.options.length > visibleLimit;

  const visibleOptions = (() => {
    if (!hasMoreOptions || showAll) return section.options;
    const sliced = section.options.slice(0, visibleLimit);
    const otherOption = section.options.find((opt) => opt.id === 'other');
    if (otherOption && !sliced.some((opt) => opt.id === 'other')) {
      return [...sliced, otherOption];
    }
    return sliced;
  })();

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

      {/* Custom text entry when "Other" is selected */}
      {isOtherSelected && (
        <div className={styles.otherBox}>
          <div className={styles.otherInputRow}>
            <input
              type="text"
              className={styles.otherInput}
              value={otherDraft}
              onChange={(e) => setOtherDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomEntry();
                }
              }}
              placeholder={
                section.otherPlaceholder || 'Type your own answer...'
              }
              maxLength={80}
              aria-label={`Custom answer for ${section.title}`}
            />
            <button
              type="button"
              className={styles.otherAddButton}
              onClick={handleAddCustomEntry}
              disabled={!otherDraft.trim()}
            >
              Add
            </button>
          </div>

          {customEntries.length > 0 && (
            <div className={styles.customTagList}>
              {customEntries.map((entry) => (
                <span key={entry} className={styles.customTag}>
                  <span>{entry}</span>
                  <button
                    type="button"
                    className={styles.customTagRemove}
                    onClick={() => handleRemoveCustomEntry(entry)}
                    aria-label={`Remove ${entry}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {hasMoreOptions && (
        <button
          type="button"
          className={styles.showMoreButton}
          onClick={() => setShowAll((previous) => !previous)}
        >
          {showAll
            ? 'Show less ↑'
            : `Show more (${section.options.length - visibleOptions.length} more) ↓`}
        </button>
      )}
    </section>
  );
}