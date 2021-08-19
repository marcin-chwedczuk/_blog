---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: 'FabGL PCEmulator na ESP32'
date: 2021-08-19 00:00:01
tags: polish elektronika
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Jakieś dwa tygodnie temu natknąłem się na artykuł
[Emulating the IBM PC on an ESP32](https://hackaday.com/2021/07/28/emulating-the-ibm-pc-on-an-esp32/).
Opisano w nim bibliotekę FabGL, stworzoną przez pana Fabrizio Di Vittorio,
oraz kilka bazujących na niej projektów.
Sama biblioteka przeznaczona jest do użytku z mikrokontrolerami z rodziny
ESP32 i pozwala na programowe generowanie sygnału wideo (VGA) oraz
obsługę myszki i klawiatury poprzez (bardzo popularne jeszcze 20 lat temu) złącze PS/2.
Wśród projektów zbudowanych z wykorzystaniem tej biblioteki znajdziemy
emulatory takich maszyn jak Altair 8800, Commodore (VIC 20) czy w końcu tytułowy IBM PC.

Nie będę ukrywał że projekt, zwłaszcza emulator IBM PC na którym można uruchomić
stary MS-DOS jak i Windows 3.11, bardzo przypadł mi do gustu.
Od razu po przeczytaniu artykułu, udałem się więc, na stronę pana Di Vittorio
na [Tindie](https://www.tindie.com/products/fabgl/fabgl-esp32-33v-board-16mb-flash-4-mb-psram/) żeby zakupić przygotowaną przez niego płytkę PCB, zawierającą sam mikrokontroler
jak również złącza VGA, 2x PS/2 oraz slot karty microSD.
Niestety spóźniłem się i jedyne co mogłem zrobić to wpisać się na długą listę oczekujących.
Nic straconego, pomyślałem, w końcu na stronie projektu autor 
[podaje](https://github.com/fdivitto/FabGL/wiki/Boards)
dość długą listę płytek kompatybilnych z jego biblioteką.
Dla hobbysty amatora, takiego jak ja płytka [TTGO VGA32 1.2](https://pl.aliexpress.com/item/33014937190.html) wydaje się być
całkiem dobrym wyborem. Płytka ta jest dostępna w Polsce jedynie za pośrednictwem
Aliexpressu, niestety czas czas realizacji zamówienia wynosi około miesiąca.
Tak wiec zamówiłem tą płytkę, nie przestając jednocześnie szukać sposobu na
na znacznie szybszą realizację tego projektu.

Płytka sprzedawana przez pana Di Vittorio posiada układ ESP32 WROVER-E z
16MB pamięci Flash i 4MB pamięci PSRAM. Niestety układ ten jest trudno dostępny 
w naszym kraju. Co gorsza na rynku jest całe mnóstwo płytek z wymaganą ilością
pamięci Flash, ale bez pamięci PSRAM która jest *niezbędna* do uruchomienia emulatora
PC. Poniżej przykład takiej *niedziałającej* płytki:
![Nie działa z emulatorem PC](assets/images/2021-08-19/esp-bad.webp)
Ostatecznie po dwóch dniach poszukiwań natknąłem się na następujący układ:
![Działa z emulatorem PC](assets/images/2021-08-19/esp-good.jpg)
Poniżej zamieszczam [link do sklepu](https://kamami.pl/esp32/583662-zestaw-rozwojowy-z-modulem-wifi-i-bluetooth-esp32-wrover.html).
Układ ten posiada co prawda tylko 4MB pamięci Flash, ale moje testy pokazały że to w zupełności wystarczy. Uwaga: układ przychodzi w postaci niezlutowanej (tak jak to przedstawia obrazek).

Następnym krokiem jaki musiałem wykonać było znalezienie schematu jednej z
kompatybilnych płytek. Nie nastręczyło mi to wielu problemów, niezbędny schemat
był zamieszczony na stronie [land-boards.com](http://land-boards.com/blwiki/index.php?title=ESP32-VGA#Schematic) jako [ESP32 VGA Rev3](http://land-boards.com/ESP32-VGA/ESP32-VGA_Rev3_Schematic.pdf).
Ponieważ układ ESP32, użyty w schemacie, ma nieco inny układ wyprowadzeń niż układ zakupiony przeze mnie, musiałem dość mocno uważać podczas łączenie poszczególnych
komponentów.
Przykładowo, na oryginalnym schemacie pin `REDLO` podłączony jest do pinu 14 mikrokontrolera, który odpowiada portowi `IO22`:
![Schemat 1](assets/images/2021-08-19/sch1.png)
Oznacza to tyle że po zamianie układu,
linia `REDLO` nadal powinna pozostać połączona z portem `IO22`. W przypadku
zakupionej płytki port ten nosi nazwę `GPIO22`:
![Schemat 2](assets/images/2021-08-19/sch2.png)

Postępując w ten sposób dalej, jedyny problem na który się natknąłem
było podłączenie pinów `MISO` i `MOSI` karty microSD.
Ostatecznie pin `MISO` podłączyłem do pinu `GOIO35`, a pin `MOSI` do pinu `GPIO12`.
Taka zmiana mapowania wymaga niestety modyfikacji kodu
emulatora, mianowicie funkcja `setup` w pliku `PCEmulator` musi zostać zmieniona:
{% highlight c %}
  if (!FileBrowser::mountSDCard(false, "/SD", 8))
    ibox.message("Error!", "This app requires a SD-CARD!", nullptr, nullptr);
{% endhighlight %}
na:
{% highlight c %}
  /* SIGNATURE: 
      bool mountSDCard  ( bool  formatOnFail,
      char const *  mountPath,
      size_t  maxFiles = 4,
      int   allocationUnitSize = 16 * 1024,
      int   MISO = 16,
      int   MOSI = 17,
      int   CLK = 14,
      int   CS = 13 
      ) 
   */

  if (!FileBrowser::mountSDCard(false, "/SD", 8, 16*1024, 35, 12, 14, 13))
    ibox.message("Error!", "This app requires a SD-CARD!", nullptr, nullptr);
{% endhighlight %}
Przy okazji podczas pierwszego uruchomienia warto również odkomentować linię:
{% highlight c %}
  // uncomment to format SD!
  //FileBrowser::format(fabgl::DriveType::SDCard, 0);
{% endhighlight %}

Bardzo ważnym elementem którego nie możemy pominąć jest konwerter napięcia 3.3V a 5V
(ang. level shifter),
występujący między ESP32 a portami PS/2. Niestety myszka i klawiatura pracuje na
wyższym napięciu 5V, które dla ESP32 może okazać się zabójcze:
![Schemat 3](assets/images/2021-08-19/sch3.png)
Ja wykorzystałem w moim projekcie [tani 4 kanałowy konwerter](https://abc-rc.pl/product-pol-6191-Konwerter-poziomow-3-3-5V-4-kanaly-stanow-logicznych-SPI-UART-Arduino.html)
 ze sklepu ABC-RC. Generalnie działanie konwertera jest banalnie proste, łączymy
 piny `GND` konwertera z pinami `GND` kontrolera oraz ze sobą nawzajem, pin `HV` konwertera podłączamy do pinu `5V` ESP32, a pin `LV`
 konwertera do pinu `3.3V`. Piny `HVx` podłączamy do gniazd PS/2 a 
 odpowiadające im piny `LVx` do wejść mikrokontrolera:
 ![Konwerter](assets/images/2021-08-19/kon.png)

 Jako gniazda PS/2 wykorzystałem mini układy o wdzięcznej angielskiej nazwie
 _ps/2 breakout board_. Generalnie tego typu gniazda są ciężko dostępne, dlatego
 większość ludzi po prostu rozcina kabel od myszki i klawiatury i dolutowuje tam
 goldpiny. Alternatywnie można próbować owijać cynowany drut wokół pinów wtyczki PS/2.
 Wszystkie chwyty dozwolone. Dla tych którzy lubią czekać stosowny link do
 [Aliexpressu](https://pl.aliexpress.com/item/1922394999.html).
 ![Breakout PS2](assets/images/2021-08-19/ps2.png)

Co do karty microSD, po prostu dolutowałem kilka przewodów do adaptera:
![SDCard](assets/images/2021-08-19/sd.png)

Jako gniazdo VGA wykorzystałem wtyk podobny do tego:
![VGA](assets/images/2021-08-19/vga.png)
Możemy go znaleźć szukając po haśle "VGA TERMINAL BLOCK".
Aczkolwiek muszę przyznać że ceny na Allegro są z kosmosu, podobna wtyczka
na Alim kosztuje maksymalnie 10 złotych.

Ostatecznie cały układ wygląda następująco:
![Z1](assets/images/2021-08-19/z1.png)

Uruchomienie:
1) Należy wykonać instrukcje podawane przez pana Fabrizio Di Vittorio na jego [kanale YT](https://www.youtube.com/watch?v=8OTaPQlSTas&list=PLv49lyEwqDNMz9XGBy6wnBzBAYFVMdCki)
2) Układ bez karty mikroSD podłączamy kablem USB do komputera i programujemy. Po restarcie układu, powinien pojawić się komunikat że karta SD jest wymagana.
3) Odłączamy układ od zasilania, wkładamy kartę SD i uruchamiamy ponownie. Karta powinna zostać wykryta a my powinniśmy zostać poproszenie o hasło do WiFi.

Z jakiegoś powodu układ nie działał stabilnie przy zasilaniu USB (np. były problemy z klawiaturą). Problem znikł gdy podłączyłem układ do zewnętrznego zasilacza 5V (plus zasilacza należy podłączyć do pinu `5V` ESP32).

Jeżeli będziecie mieli kłopoty z uruchomieniem układu możecie zadawać pytania poprzez forum 4programmers (tagując `@0xmarcin`) lub pisząc do mnie email `0xmarcin małpa gmail.com`.

Na koniec kilka zdjęć działającego emulatora oraz jedna uwaga:
![Emulator w akcji](assets/images/2021-08-19/e1.png)
![Emulator w akcji](assets/images/2021-08-19/e2.png)
![Emulator w akcji](assets/images/2021-08-19/e3.png)

Emulator działa zadziwiająco dobrze ale nie idealnie. Podczas testów okazało się że niektóre aplikacje Win 3.11 potrafią otwierać się naprawdę powoli (czasy rzędu 10 lub 15 sekund). Niestety wiele aplikacji potrafi zawiesić emulator, w tym spora część dołączonych gier MS-DOS. Generalnie nie jest to ukończony produkt ale raczej wersja beta. Generowany przez ESP32 obraz również nie jest krystalicznie czysty (choć tutaj winna może być słaba jakość połączeń na płytce stykowej).

Ostatecznie jest to projekt który wykonuje się dla zabawy. Jeżeli ktoś się chce po prostu pobawić Win 3.11 to można to zrobić wprost z przeglądarki
[archive.org/details/win3_stock](https://archive.org/details/win3_stock).