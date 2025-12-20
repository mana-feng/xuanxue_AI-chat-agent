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

// Admin CRUD
export function adminListAnnouncements() {
	return request<Announcement[]>('/api/admin/announcements', { method: 'GET', needAuth: true });
}

export function adminCreateAnnouncement(payload: {
	title: string;
	content: string;
	expiresAt?: string | null;
}) {
	return request<{ success: boolean; id: number }>('/api/admin/announcements', {
		method: 'POST',
		data: payload,
		needAuth: true,
	});
}

export function adminUpdateAnnouncement(
	id: number,
	payload: { title: string; content: string; expiresAt?: string | null }
) {
	return request<{ success: boolean }>(`/api/admin/announcements/${id}`, {
		method: 'PUT',
		data: payload,
		needAuth: true,
	});
}

export function adminDeleteAnnouncement(id: number) {
	return request<{ success: boolean }>(`/api/admin/announcements/${id}`, {
		method: 'DELETE',
		needAuth: true,
	});
}

