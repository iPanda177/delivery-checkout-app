import {
  Tag,
  Listbox,
  EmptySearchResult,
  Combobox,
  Text,
  AutoSelection, InlineStack,
} from "@shopify/polaris";
import {useState, useCallback, useMemo, useEffect} from "react";
import {Location, LocationGraphQLResponse, RuleState} from "~/types/types";

export default function LocationSelectCombobox({
  locations,
  selectedLocations,
  setSelectedLocations,
}: {
  locations: LocationGraphQLResponse[];
  selectedLocations: Location[];
  setSelectedLocations: (selectedLocations: Location[]) => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [suggestion, setSuggestion] = useState<string | undefined>("");

  useEffect(() => {
    const selectedLocationsNames = selectedLocations.map((location) => location.locationName);

    setSelectedTags(selectedLocationsNames);
  }, [locations, selectedLocations]);

  const suggestions = useMemo(
    () => locations.map((location) => location.name),
    [locations],
  );

  const handleChange = useCallback(
    (value: string) => {
      const suggestion =
        value &&
        suggestions.find((suggestion) =>
          suggestion.toLowerCase().startsWith(value.toLowerCase()),
        );

      setValue(value);
      setSuggestion(suggestion);
    },
    [suggestions],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Tab') {
        setValue(suggestion || value);
        setSuggestion('');
      } else if (event.key === 'Backspace') {
        setValue(value);
        setSuggestion('');
      }
    },
    [value, suggestion],
  );

  const handleActiveOptionChange = useCallback(
    (activeOption: string) => {
      const activeOptionIsAction = activeOption === value;

      if (!activeOptionIsAction && !selectedTags.includes(activeOption)) {
        setSuggestion(activeOption);
      } else {
        setSuggestion("");
      }
    },
    [value, selectedTags]
  );

  const updateSelection = useCallback(
    (selected: string) => {
      const nextSelectedTags = new Set([...selectedTags]);

      if (nextSelectedTags.has(selected)) {
        nextSelectedTags.delete(selected);
      } else {
        nextSelectedTags.add(selected);
      }

      const selectedLocations = locations
        .filter((location) => nextSelectedTags.has(location.name))
        .map((location) => {
          return { locationId: location.id, locationName: location.name }
        })

      setSelectedLocations(selectedLocations);
      setSelectedTags([...nextSelectedTags]);
      setValue("");
      setSuggestion("");
    },
    [selectedTags, locations, setSelectedLocations]
  );

  const removeTag = useCallback(
    (tag: string) => () => {
      updateSelection(tag);
    },
    [updateSelection]
  );

  const getAllWarehouses = useCallback(() => {
    return [...new Set([...suggestions, ...selectedTags].sort())];
  }, [selectedTags, suggestions]);

  const formatOptionText = useCallback(
    (option: string) => {
      const trimValue = value.trim().toLocaleLowerCase();
      const matchIndex = option.toLocaleLowerCase().indexOf(trimValue);

      if (!value || matchIndex === -1) return option;

      const start = option.slice(0, matchIndex);
      const highlight = option.slice(matchIndex, matchIndex + trimValue.length);
      const end = option.slice(matchIndex + trimValue.length, option.length);

      return (
        <p>
          {start}
          <Text fontWeight="bold" as="span">
            {highlight}
          </Text>
          {end}
        </p>
      );
    },
    [value]
  );

  const escapeSpecialRegExCharacters = useCallback(
    (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    []
  );

  const options = useMemo(() => {
    let list;
    const allTags = getAllWarehouses();
    const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), "i");

    if (value) {
      list = allTags.filter((tag) => tag.match(filterRegex));
    } else {
      list = allTags;
    }

    return [...list];
  }, [value, getAllWarehouses, escapeSpecialRegExCharacters]);

  const verticalContentMarkup =
    selectedTags.length > 0 ? (
      <InlineStack gap={"100"} align="start">
        {selectedTags.map((tag) => (
          <Tag key={`option-${tag}`} onRemove={removeTag(tag)}>
            {tag}
          </Tag>
        ))}
      </InlineStack>
    ) : null;

  const optionMarkup =
    options.length > 0
      ? options.map((option) => {
          return (
            <Listbox.Option
              key={option}
              value={option}
              selected={selectedTags.includes(option)}
              accessibilityLabel={option}
            >
              <Listbox.TextOption selected={selectedTags.includes(option)}>
                {formatOptionText(option)}
              </Listbox.TextOption>
            </Listbox.Option>
          );
        })
      : null;

  const noResults = value && !getAllWarehouses().includes(value);

  const actionMarkup = noResults ? (
    <Listbox.Action value={value}>{`Add "${value}"`}</Listbox.Action>
  ) : null;

  const emptyStateMarkup = optionMarkup ? null : (
    <EmptySearchResult
      title=""
      description={`No tags found matching "${value}"`}
    />
  );

  const listboxMarkup =
    optionMarkup || actionMarkup || emptyStateMarkup ? (
      <Listbox
        autoSelection={AutoSelection.None}
        onSelect={updateSelection}
        onActiveOptionChange={handleActiveOptionChange}
      >
        {actionMarkup}
        {optionMarkup}
      </Listbox>
    ) : null;

  return (
    <Combobox
      allowMultiple
      activator={
        <div onKeyDown={handleKeyDown}>
          <Combobox.TextField
            autoComplete="off"
            label="Search locations "
            labelHidden
            value={value}
            suggestion={suggestion}
            placeholder="Search locations"
            verticalContent={verticalContentMarkup}
            onChange={handleChange}
          />
        </div>
      }
    >
      {listboxMarkup}
    </Combobox>
  );
}
