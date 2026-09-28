import type { GalleryConfig } from "@/types/galleryConfig";

// 相册配置
export const galleryConfig: GalleryConfig = {
	// 相册列表
	albums: [
		// 支持jpg/png/webp/avif/gif格式
		{
			id: "sea-2026",
			name: "海边随手拍",
			description: "张开双臂，拥抱大海。慢慢来，比较快。",
			location: "海边",
			date: "2026-09-28",
			tags: ["旅行", "海边"],
		},
		],

	// 瀑布流最小列宽(px)，浏览器根据容器宽度自动计算列数，默认 240
	// 值越小列数越多，值越大列数越少
	columnWidth: 240,
};
