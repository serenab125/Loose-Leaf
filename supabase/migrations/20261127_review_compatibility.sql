
-- RR-10: Compatibility between a signed-in reader and
-- an author of a review or unlocked chapter reaction.
-- Returns only a percentage, never raw quiz answers.

CREATE OR REPLACE FUNCTION public.get_review_compatibility(
  p_book_id text,
  p_reviewer_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_prefs jsonb;
  reviewer_prefs jsonb;

  category_name text;
  category_weight numeric;

  current_answers text[];
  reviewer_answers text[];

  shared_count integer;
  union_count integer;

  weighted_score numeric := 0;
  available_weight numeric := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_book_id IS NULL
     OR length(btrim(p_book_id)) = 0
     OR p_reviewer_id IS NULL
     OR p_reviewer_id = current_user_id THEN
    RETURN NULL;
  END IF;

  -- Author must have reviewed this book OR posted an
  -- unlocked reaction for this book.
  IF NOT EXISTS (
    SELECT 1
    FROM public.book_reviews br
    WHERE br.user_id = p_reviewer_id
      AND br.book_id = p_book_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.book_page_reactions r
    WHERE r.user_id = p_reviewer_id
      AND r.book_id = p_book_id
      AND r.page_number <= COALESCE(
        (
          SELECT MAX(mine.page_number)
          FROM public.book_page_reactions mine
          WHERE mine.user_id = current_user_id
            AND mine.book_id = p_book_id
        ),
        0
      )
  ) THEN
    RETURN NULL;
  END IF;

  SELECT reading_preferences
  INTO current_prefs
  FROM public.profiles
  WHERE id = current_user_id;

  SELECT reading_preferences
  INTO reviewer_prefs
  FROM public.profiles
  WHERE id = p_reviewer_id;

  IF current_prefs IS NULL
     OR reviewer_prefs IS NULL
     OR jsonb_typeof(current_prefs) <> 'object'
     OR jsonb_typeof(reviewer_prefs) <> 'object'
     OR current_prefs = '{}'::jsonb
     OR reviewer_prefs = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  FOR category_name, category_weight IN
    SELECT *
    FROM (
      VALUES
        ('stories'::text, 45::numeric),
        ('vibe'::text, 35::numeric),
        ('movies-tv'::text, 20::numeric)
    ) AS weights(name, weight)
  LOOP

    -- Current reader's answers
    SELECT COALESCE(
      array_agg(DISTINCT normalized_answer),
      ARRAY[]::text[]
    )
    INTO current_answers
    FROM (
      SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) AS normalized_answer
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(current_prefs -> category_name) = 'array'
          THEN current_prefs -> category_name
          ELSE '[]'::jsonb
        END
      ) AS selected(value)
      WHERE lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) NOT IN (
        'not-sure', 'surprise', 'everything', 'other'
      )

      UNION

      SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) AS normalized_answer
      FROM jsonb_array_elements_text(
        CASE
          WHEN (current_prefs -> category_name) ? 'other'
            AND jsonb_typeof(
              current_prefs -> (category_name || '-other')
            ) = 'array'
          THEN current_prefs -> (category_name || '-other')
          ELSE '[]'::jsonb
        END
      ) AS custom(value)
    ) AS combined
    WHERE normalized_answer <> '';

    -- Reviewer's answers
    SELECT COALESCE(
      array_agg(DISTINCT normalized_answer),
      ARRAY[]::text[]
    )
    INTO reviewer_answers
    FROM (
      SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) AS normalized_answer
      FROM jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(reviewer_prefs -> category_name) = 'array'
          THEN reviewer_prefs -> category_name
          ELSE '[]'::jsonb
        END
      ) AS selected(value)
      WHERE lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) NOT IN (
        'not-sure', 'surprise', 'everything', 'other'
      )

      UNION

      SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g')) AS normalized_answer
      FROM jsonb_array_elements_text(
        CASE
          WHEN (reviewer_prefs -> category_name) ? 'other'
            AND jsonb_typeof(
              reviewer_prefs -> (category_name || '-other')
            ) = 'array'
          THEN reviewer_prefs -> (category_name || '-other')
          ELSE '[]'::jsonb
        END
      ) AS custom(value)
    ) AS combined
    WHERE normalized_answer <> '';

    -- Skip categories without answers from both readers.
    IF cardinality(current_answers) = 0
       OR cardinality(reviewer_answers) = 0 THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*)
    INTO shared_count
    FROM (
      SELECT unnest(current_answers)
      INTERSECT
      SELECT unnest(reviewer_answers)
    ) AS shared;

    SELECT COUNT(*)
    INTO union_count
    FROM (
      SELECT unnest(current_answers)
      UNION
      SELECT unnest(reviewer_answers)
    ) AS combined;

    IF union_count > 0 THEN
      weighted_score :=
        weighted_score +
        (shared_count::numeric / union_count) * category_weight;

      available_weight :=
        available_weight + category_weight;
    END IF;
  END LOOP;

  IF available_weight = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(
    (weighted_score / available_weight) * 100
  )::integer;
END;
$function$;

REVOKE ALL ON FUNCTION
  public.get_review_compatibility(text, uuid)
FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION
  public.get_review_compatibility(text, uuid)
TO authenticated;