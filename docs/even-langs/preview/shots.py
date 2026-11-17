import asyncio, sys
from playwright.async_api import async_playwright

BASIS = "http://localhost:8765"
UIT = sys.argv[1]
SCHERMEN = {"desktop": dict(viewport={"width": 1280, "height": 900}, device_scale_factor=1),
            "390": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for naam, opt in SCHERMEN.items():
            ctx = await b.new_context(**opt)
            pg = await ctx.new_page()
            pg.on("console", lambda m: m.type == "error" and print("console:", m.text))
            # 1 + 4: homepage, filterbalk en eerste kaarten
            await pg.goto(BASIS + "/", wait_until="networkidle")
            await pg.evaluate("document.querySelector('.filters').scrollIntoView({block:'start'}); window.scrollBy(0,-70)")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f"{UIT}/1-homepage-{naam}.png")
            # Hoogtes ter controle
            h = await pg.evaluate("[...document.querySelectorAll('.kaart')].slice(0,3).map(k=>Math.round(k.getBoundingClientRect().height))")
            print(naam, "kaarthoogtes (tip, verhaal, verhaal):", h)
            # 1b: eerste twee rijen van het raster (rijhoogtes)
            await pg.evaluate("document.getElementById('verhalen').scrollIntoView({block:'start'}); window.scrollBy(0,-80)")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"{UIT}/1b-raster-{naam}.png")
            # 2: tippagina, volledige pagina tot en met het verwant-blok
            await pg.goto(BASIS + "/posts/de-kleine-kapitein.html", wait_until="networkidle")
            await pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
            await pg.wait_for_timeout(600)
            await pg.screenshot(path=f"{UIT}/2-tippagina-{naam}.png", full_page=True)
            # 3: kaart met tip-popup en verhaal-popup
            await pg.goto(BASIS + "/kaart.html", wait_until="networkidle")
            await pg.wait_for_timeout(800)
            await pg.evaluate("window.__map.setView([51.9222, 4.4865], 16, {animate:false})")
            await pg.evaluate("document.getElementById('plattegrond').scrollIntoView({block:'center'})")
            await pg.wait_for_timeout(300)
            kaart = pg.locator("#plattegrond")
            await kaart.screenshot(path=f"{UIT}/3a-pins-{naam}.png")
            for zoek, bestand in [("De Kleine Kapitein", "3b-popup-tip"), ("RiF010", "3c-popup-verhaal")]:
                await pg.evaluate(f"""(() => {{ const pl = window.__plekken.find(x => x.data.naam === {zoek!r});
                    window.__map.setView(pl.marker.getLatLng(), 16, {{animate:false}}); pl.marker.openPopup(); }})()""")
                await pg.wait_for_timeout(500)
                await kaart.screenshot(path=f"{UIT}/{bestand}-{naam}.png")
                await pg.evaluate("window.__map.closePopup()")
            # 3d: link vanaf de tippagina (kaart.html?plek=...)
            await pg.goto(BASIS + "/kaart.html?plek=de-kleine-kapitein", wait_until="networkidle")
            await pg.wait_for_timeout(900)
            await pg.locator("#plattegrond").screenshot(path=f"{UIT}/3d-link-naar-pin-{naam}.png")
            # 4 los: filterbalk op de kaartpagina
            await pg.locator(".filters").screenshot(path=f"{UIT}/4-filter-kaartpagina-{naam}.png")
            await ctx.close()
        await b.close()

asyncio.run(main())
