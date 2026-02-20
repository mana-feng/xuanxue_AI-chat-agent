import { request } from './index';

export interface Announcement {
	id: number;
	title: string;
	content: string;
	expiresAt: string | null;
	updatedAt: string | null;
	createdAt: string | null;
}

export interface AnnouncementMeta {
	id: number;
	updatedAt: string | null;
}

export function fetchAnnouncementMeta() {
	return request<{ meta: AnnouncementMeta[] }>('/api/announcements?onlyMeta=true', {
		method: 'GET',
		needAuth: false,
	});
}

export function fetchAnnouncements() {
	return request<{ list: Announcement[] }>('/api/announcements', {
		method: 'GET',
		needAuth: false,
	});
}

