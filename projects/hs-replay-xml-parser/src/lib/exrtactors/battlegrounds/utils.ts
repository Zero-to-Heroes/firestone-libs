export const normalizeHeroCardId = (heroCardId: string): string => {
	if (!heroCardId) {
		return heroCardId;
	}

	// Generic handling of BG hero skins, hoping they will keep the same pattern
	const bgHeroSkinMatch = heroCardId.match(/(.*)_SKIN_.*/);
	if (bgHeroSkinMatch) {
		return bgHeroSkinMatch[1];
	}

	if (heroCardId === 'TB_BaconShop_HERO_59t') {
		return 'TB_BaconShop_HERO_59';
	}
	return heroCardId;
};
