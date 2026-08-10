# Route Reflect

The source repository for [Route Reflect](https://blog.routereflect.com), a personal engineering blog about networking, data centers, infrastructure, automation, and troubleshooting.

## Architecture

- Content and Jekyll source are maintained in this GitHub repository.
- Cloudflare Pages builds and publishes the site from the `master` branch.
- The production domain is [blog.routereflect.com](https://blog.routereflect.com).
- The former domain redirects to the production domain through Cloudflare.

## Content

- Blog posts: `_posts/`
- Images and static assets: `img/`
- Site configuration: `_config.yml`
- Layouts and includes: `_layouts/` and `_includes/`

## Local preview

Install Jekyll and the required plugins, then run:

```sh
jekyll serve
```

Open `http://127.0.0.1:4000/` in a browser.

## Theme

This site is based on the Jekyll themes by [Hux](https://github.com/Huxpro/huxpro.github.io) and [Baiying Qiu](https://github.com/qiubaiying/qiubaiying.github.io).

## License

See [LICENSE](LICENSE).
