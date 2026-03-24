package com.johnmoorman.relocation.model

import com.fasterxml.jackson.annotation.JsonValue

/**
 * Berlin districts (Bezirke).
 * The JsonValue annotation ensures lowercase serialization matching the TypeScript type.
 */
enum class Bezirk(@JsonValue val slug: String, val displayName: String) {
    MITTE("mitte", "Mitte"),
    FRIEDRICHSHAIN_KREUZBERG("friedrichshain-kreuzberg", "Friedrichshain-Kreuzberg"),
    PANKOW("pankow", "Pankow"),
    CHARLOTTENBURG_WILMERSDORF("charlottenburg-wilmersdorf", "Charlottenburg-Wilmersdorf"),
    SPANDAU("spandau", "Spandau"),
    STEGLITZ_ZEHLENDORF("steglitz-zehlendorf", "Steglitz-Zehlendorf"),
    TEMPELHOF_SCHOENEBERG("tempelhof-schoeneberg", "Tempelhof-Schöneberg"),
    NEUKOELLN("neukoelln", "Neukölln"),
    TREPTOW_KOEPENICK("treptow-koepenick", "Treptow-Köpenick"),
    MARZAHN_HELLERSDORF("marzahn-hellersdorf", "Marzahn-Hellersdorf"),
    LICHTENBERG("lichtenberg", "Lichtenberg"),
    REINICKENDORF("reinickendorf", "Reinickendorf");

    companion object {
        fun fromSlug(slug: String): Bezirk? =
            entries.find { it.slug == slug.lowercase() }
    }
}
