import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	if (context.url.pathname.startsWith('/admin') && !context.cookies.has('session')) {
		return context.redirect('/login');
	}
	return next();
});
