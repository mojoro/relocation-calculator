package com.johnmoorman.relocation.model

/**
 * Extension properties for the generated Bezirk enum.
 * Display names contain proper Unicode characters (umlauts, etc.)
 */
val Bezirk.displayName: String
    get() = when (this) {
        Bezirk.MITTE -> "Mitte"
        Bezirk.FRIEDRICHSHAIN_KREUZBERG -> "Friedrichshain-Kreuzberg"
        Bezirk.PANKOW -> "Pankow"
        Bezirk.CHARLOTTENBURG_WILMERSDORF -> "Charlottenburg-Wilmersdorf"
        Bezirk.SPANDAU -> "Spandau"
        Bezirk.STEGLITZ_ZEHLENDORF -> "Steglitz-Zehlendorf"
        Bezirk.TEMPELHOF_SCHOENEBERG -> "Tempelhof-Schöneberg"
        Bezirk.NEUKOELLN -> "Neukölln"
        Bezirk.TREPTOW_KOEPENICK -> "Treptow-Köpenick"
        Bezirk.MARZAHN_HELLERSDORF -> "Marzahn-Hellersdorf"
        Bezirk.LICHTENBERG -> "Lichtenberg"
        Bezirk.REINICKENDORF -> "Reinickendorf"
    }

fun bezirkFromSlug(slug: String): Bezirk? =
    Bezirk.entries.find { it.value == slug.lowercase() }
