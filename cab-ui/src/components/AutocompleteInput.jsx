import { useEffect, useState } from "react";
import { searchPlaces } from "../../services/osrm";

export default function AutocompleteInput({ placeholder, defaultValue, onSelect }) {
  const [query, setQuery] = useState(defaultValue || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(defaultValue || "");
  }, [defaultValue]);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const places = await searchPlaces(query, 5);
        if (!controller.signal.aborted) {
          setSuggestions(places);
        }
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
              key={item.placeId}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => {
                setQuery(item.displayName);
                setSuggestions([]);
                onSelect({
                  name: item.displayName,
                  address: item.address,
                  lat: item.lat,
                  lng: item.lng,
                });
              }}
            >
              {item.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
