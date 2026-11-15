<script lang="ts">
	import { siteConfig, siteUrl, ogImagePath } from '../config.js';
	import { jsonLdScript, structuredData } from '../structured-data.js';

	/** `title` is the page title without the site name; omit it for the home page. */
	let {
		title,
		description,
		pathname,
		type = 'website'
	}: {
		title?: string;
		description: string;
		pathname: string;
		type?: 'website' | 'article';
	} = $props();

	const fullTitle = $derived(title ? `${title} - ${siteConfig.name}` : siteConfig.name);
	const url = $derived(siteUrl(pathname));
	const image = $derived(siteUrl(ogImagePath(pathname)));
	const imageAlt = $derived(`${fullTitle}: ${description}`);
	const jsonLd = $derived(jsonLdScript(structuredData({ pathname, title, description })));
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={siteConfig.name} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="628" />
	<meta property="og:image:alt" content={imageAlt} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	<meta name="twitter:image:alt" content={imageAlt} />
	<!-- Built from site config and page data; `<` is escaped in jsonLdScript. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>
