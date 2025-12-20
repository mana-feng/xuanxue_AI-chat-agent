import { defineStore } from 'pinia';

export interface LiuyaoProfile {
	title: string;
	questioner: string;
	method: string;
	gender: string;
	location: string;
	dayGanZhi: string;
	timeLabel: string;
	focus: string;
	note?: string;
}

export interface LiuyaoResultPayload {
	compiled: any;
	display: any;
	profile: LiuyaoProfile;
	createdAt: number;
}

interface State {
	compiled: any | null;
	display: any | null;
	profile: LiuyaoProfile | null;
	createdAt: number | null;
}

export const useLiuyaoStore = defineStore('liuyao', {
	state: (): State => ({
		compiled: null,
		display: null,
		profile: null,
		createdAt: null
	}),
	actions: {
		setResult(payload: LiuyaoResultPayload) {
			this.compiled = payload.compiled;
			this.display = payload.display;
			this.profile = payload.profile;
			this.createdAt = payload.createdAt;
		},
		clear() {
			this.compiled = null;
			this.display = null;
			this.profile = null;
			this.createdAt = null;
		}
	}
});
