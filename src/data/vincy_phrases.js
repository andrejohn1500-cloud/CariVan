export const VINCY_PHRASES = [
      { text: "Wah gwaan!", category: "greeting" },
        { text: "Aye aye, how yuh do?", category: "greeting" },
          { text: "Leeward bound, move nah!", category: "driving" },
            { text: "De van full up, squeeze in!", category: "driving" },
              { text: "Kingstown in five, hold tight!", category: "driving" },
                { text: "Watch de corner dey!", category: "driving" },
                  { text: "Sound de horn man!", category: "driving" },
                    { text: "Nobody can't catch me!", category: "racing" },
                      { text: "Feel de speed ting!", category: "racing" },
                        { text: "De volcano smokin today oui!", category: "scenery" },
                          { text: "Look how blue de sea set!", category: "scenery" },
                            { text: "Soufriere standing tall!", category: "scenery" },
                              { text: "Bequia next stop, all aboard!", category: "boat" },
                                { text: "Tobago Cays crystal clear!", category: "boat" },
                                  { text: "Fish fresh from de Grenadines!", category: "fishing" },
                                    { text: "Vincy to de bone!", category: "pride" },
                                      { text: "SVG run tings!", category: "pride" },
                                        { text: "Hairoun represent!", category: "pride" },
                                          { text: "Eh eh! Yuh serious?", category: "reaction" },
                                            { text: "Ting sweet!", category: "reaction" },
];

export const QUICK_CHAT = [
      "Wah gwaan!", "Leeward bound!", "SVG run tings!",
        "Bequia next!", "Ting sweet!", "Lawd have mercy!",
];

export function getRandomPhrase(category = null) {
      const pool = category
          ? VINCY_PHRASES.filter(p => p.category === category)
              : VINCY_PHRASES;
                return pool[Math.floor(Math.random() * pool.length)]?.text ?? "Wah gwaan!";
}
