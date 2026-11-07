import type { LngLatTuple, MapViewport } from '#lib/registry/ui/map/index.js';

export interface Store {
	id: string;
	name: string;
	address: string;
	hours: string;
	lngLat: LngLatTuple;
}

/** Central Amsterdam. */
export const VIEWPORT: MapViewport = {
	center: [4.895, 52.37],
	zoom: 12.5,
	bearing: 0,
	pitch: 0
};

/** Where the shopper starts before searching or dragging the pin. */
export const START: LngLatTuple = [4.8952, 52.3702];

export const STORES: Store[] = [
	{
		id: 'jordaan',
		name: 'Jordaan',
		address: 'Westerstraat 12',
		hours: '08:00–20:00',
		lngLat: [4.8812, 52.3781]
	},
	{
		id: 'de-pijp',
		name: 'De Pijp',
		address: 'Ferdinand Bolstraat 40',
		hours: '08:00–21:00',
		lngLat: [4.8925, 52.3553]
	},
	{
		id: 'oost',
		name: 'Oost',
		address: 'Javaplein 3',
		hours: '09:00–19:00',
		lngLat: [4.9405, 52.3638]
	},
	{
		id: 'west',
		name: 'Oud-West',
		address: 'Kinkerstraat 88',
		hours: '08:00–20:00',
		lngLat: [4.8668, 52.3662]
	},
	{
		id: 'noord',
		name: 'Noord',
		address: 'Buikslotermeerplein 1',
		hours: '09:00–18:00',
		lngLat: [4.9411, 52.3999]
	},
	{
		id: 'centraal',
		name: 'Centraal',
		address: 'Stationsplein 7',
		hours: '07:00–22:00',
		lngLat: [4.9003, 52.3786]
	},
	{
		id: 'zuid',
		name: 'Zuid',
		address: 'Beethovenstraat 70',
		hours: '08:00–20:00',
		lngLat: [4.8774, 52.3434]
	}
];
