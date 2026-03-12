import { useEffect, useState } from "react";

export default function AutocompleteInput({ placeholder, defaultValue, onSelect }) {
  const [query, setQuery] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="relative w-1/3 ">
      <input
        className="border p-2 rounded w-full"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="absolute bg-white border w-full p-2 text-sm text-gray-400">
          Đang tìm...
        </div>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute bg-white border w-full rounded shadow mt-1 z-50 max-h-60 overflow-auto">
          {suggestions.map((item) => (
            <li
              key={item.place_id}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => {
                setQuery(item.display_name);
                setSuggestions([]);
                onSelect({
                  name: item.display_name,
                  lat: item.lat,
                  lng: item.lon,
                });
              }}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}