<script lang="ts">
	import {
		Map,
		MapCompassControl,
		MapControlContainer,
		MapZoomControl
	} from '#lib/registry/ui/map/index.js';
</script>

<Map class="size-full" viewport={{ center: [-73.9855, 40.758], zoom: 14, bearing: -29, pitch: 45 }}>
	<MapControlContainer position="top-right">
		<MapZoomControl />
		<MapCompassControl />
	</MapControlContainer>
</Map>
