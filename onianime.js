const BASE_URL = "https://onianime.hu";

const DEFAULT_HEADERS = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `${BASE_URL}/home`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-GPC": "1",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:149.0) Gecko/20100101 Firefox/149.0"
};

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function parseStatusText(status) {
    if (!status) return "Unknown";
    return status;
}

function extractAnimeIdFromUrl(url) {
    const match = String(url).match(/\/anime\/(\d+)/);
    return match ? match[1] : null;
}

function extractAnimeIdFromEpisodeQuery(url) {
    const match = String(url).match(/[?&]_animeId=(\d+)/);
    return match ? match[1] : null;
}

function extractEpisodeFromQuery(url) {
    const match = String(url).match(/[?&]ep=(\d+)/);
    return match ? match[1] : null;
}

async function searchResults(keyword) {
    const results = [];

    try {
        const response = await fetchv2(
            `${BASE_URL}/api/animes/search?search=` + encodeURIComponent(keyword),
            DEFAULT_HEADERS
        );
        const data = await response.json();

        const animes = safeArray(data.animes);

        for (const anime of animes) {
            results.push({
                title: anime.name || anime.eng_name || "Unknown",
                image: anime.image || "",
                href: `/anime/${anime.id}`
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        console.log("searchResults error:", err);
        return JSON.stringify([{
            title: "Error",
            image: "",
            href: "Error"
        }]);
    }
}

async function extractDetails(url) {
    try {
        const id = extractAnimeIdFromUrl(url);
        if (!id) {
            return JSON.stringify([{
                description: "Error",
                aliases: "Error",
                airdate: "Unknown"
            }]);
        }

        const response = await fetchv2(`${BASE_URL}/api/anime/${id}/info`, DEFAULT_HEADERS);
        const data = await response.json();

        const aliases = [
            data.eng_name,
            data.studio ? `Studio: ${data.studio}` : null,
            data.translator ? `Translator: ${data.translator}` : null,
            safeArray(data.tags).length ? `Tags: ${data.tags.join(", ")}` : null,
            data.status ? `Status: ${parseStatusText(data.status)}` : null
        ].filter(Boolean).join(" • ");

        return JSON.stringify([{
            description: data.description || "N/A",
            aliases: aliases || "N/A",
            airdate: data.release_year ? String(data.release_year) : "Unknown"
        }]);
    } catch (err) {
        console.log("extractDetails error:", err);
        return JSON.stringify([{
            description: "Error",
            aliases: "Error",
            airdate: "Error"
        }]);
    }
}

async function extractEpisodes(url) {
    const results = [];

    try {
        const id = extractAnimeIdFromUrl(url);
        if (!id) {
            return JSON.stringify([{
                href: "Error",
                number: "Error"
            }]);
        }

        const response = await fetchv2(`${BASE_URL}/api/anime/${id}/episodes`, DEFAULT_HEADERS);
        const data = await response.json();

        const episodes = safeArray(data.episodes).sort((a, b) => Number(a.ep) - Number(b.ep));

        for (const ep of episodes) {
            results.push({
                href: `?_animeId=${id}&ep=${ep.ep}`,
                number: ep.ep
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        console.log("extractEpisodes error:", err);
        return JSON.stringify([{
            href: "Error",
            number: "Error"
        }]);
    }
}

async function extractStreamUrl(ID) {
    try {
        const animeId = extractAnimeIdFromEpisodeQuery(ID);
        const ep = extractEpisodeFromQuery(ID);

        if (!animeId || !ep) {
            return "https://error.org/";
        }

        const response = await fetchv2(
            `${BASE_URL}/api/anime/${animeId}/parts?episode=${ep}&type=sub&server=karks`,
            DEFAULT_HEADERS
        );
        const data = await response.json();

        const sources = safeArray(data.sources);
        if (sources.length === 0) {
            return "https://error.org/";
        }

        const streams = sources.map(source => ({
            title: source.label || "Default",
            streamUrl: source.src,
            headers: {
                "Referer": `${BASE_URL}/home`,
                "User-Agent": DEFAULT_HEADERS["User-Agent"]
            }
        }));

        return JSON.stringify({
            streams: streams
        });
    } catch (err) {
        console.log("extractStreamUrl error:", err);
        return "https://error.org/";
    }
}
