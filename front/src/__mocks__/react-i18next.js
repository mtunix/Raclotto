module.exports = {
    useTranslation: () => ({
        t: (key) => key,
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
};
