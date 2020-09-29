---
author: mc
layout: post
cover: 'assets/images/mc_cover6.jpg'
title: 'Minikomputer 8085 - Część II'
date: 2020-09-29 00:00:01
tags: polish elektronika
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

W poprzednim wpisie udało nam się zbudować działający minikomputer oraz uruchomić
na nim napisany przez Davida Huntera monitor. Dla przypomnienia zbudowana przeze mnie
maszyna wyglądała następująco:
![Minikomputer wyłaniający się z chaosu](assets/images/2020-09-29/comp1.jpeg)
Podczas kilku kolejnych godzin pracy z komputerem, szybko okazało się że taka plątanina
przewodów znacznie utrudnia debugowanie i rozwiązywanie problemów.
Co gorsza przewody połączeniowe nie zapewniały dobrej jakości połączeń pomiędzy układami scalonymi.
W efekcie komputer potrafił nie startować lub zawieszał się podczas wykonywania programów.

Kolejną ważną rzeczą którą pominąłem podczas budowy komputera są 
kondensatory odsprzęgające (ang. decoupling capacitors). 
Układy scalone, zwłaszcza te należące do rodziny 74LS 
potrafią emitować sporo zakłóceń podczas zmiany stanu.
Dołączenie kondensatora foliowego lub ceramicznego o pojemności 0.1uF do linii zasilania układu
scalonego pozwala zmniejszyć zakłócenia i poprawia stabilność działania układu.

Teraz nadszedł czas żeby naprawić wszystkie powyższe mankamenty. 
Przewody połączeniowe zastąpiłem
ciętymi na wymiar przewodami jednożyłowymi. Oprócz kondensatorów odsprzęgających,
dodałem do szyny zasilania również jeden duży kondensator elektrolityczny o
znacznej pojemności (470uF). Generalnie dodawania tak dużych kondensatorów nie jest
zalecane bo potrafi mocno obciążyć zasilacz w momencie startu układu.
Ja używam prostego zasilacza do płytek stykowych który przeżył już niejedno zwarcie,
więc na razie postanowiłem zignorować ten problem.
Efekt mojej pracy widać poniżej:
![Minikomputer tym razem z porządnymi połączeniami](assets/images/2020-09-29/comp2.jpeg)

Przy okazji przebudowy komputera postanowiłem wprowadzić też kilka modyfikacji.
Po pierwsze zastąpiłem pojedyńczy rejestr wejścia/wyjścia z projektu Huntera
dwoma rejestrami wyjściowymi i jednym wejściowym. Dzięki temu w prosty sposób
będziemy mogli podłączyć do komputera zarówno 2x16 znakowy wyświetlacz LCD,
jak i parę przycisków. 

Warto tutaj zaznaczyć że oryginalny projekt Huntera również pozwala na integracje z
wyświetlaczem LCD, jeżeli tylko wykorzystamy rejestry przesuwne 74LS595 do zwielokrotnienia liczby
wyjść. Dokładnie tą samą sztuczkę wykorzystał Ben Eater w swoim 
[programatorze EEPROM](https://github.com/beneater/eeprom-programmer).

Ostatecznie po wszystkich modyfikacjach schemat komputera wygląda następująco:
![Schemat minikomputera](assets/images/2020-09-29/mikrus-85.svg)
Powyższy schemat oddaje jeden do jednego układ połączeń oraz typ układów scalonych które znalazły się
na moich płytkach stykowych. Na przykład miałem pod ręką tylko jeden układ 74HCT574.
Przy budowie portów wyjściowych musiałem więc wykorzystać dwa starsze układy 74HCT374,
które robią co prawda to samo co 74HCT574, ale mają znacznie mnie wygodny układ wyprowadzeń.
Podobnie nie posiadałem 74LS373 więc użyłem 74LS574 w połączeniu z inwerterem.
Na koniec przypomnę że układy rodzin 74LS i 74HCT są ze sobą kompatybilne i można je
stosować zamiennie.

Schemat minikomputera został stworzony w darmowym i popularnym wśród hobbystów programie
[KiCad](https://kicad-pcb.org/). Podczas tworzenia schematu nie widziałem co wpisać w pole tytuł,
postanowiłem więc nadać mojemu komputerowi nazwę Mikrus-85. Hurra!

Kolejny celem jaki przed sobą postawiłem była kompilacja i uruchamianie na Mikrusie
programów napisanych w C.
Niestety już samo znalezienie odpowiedniego kompilatora stanowiło duży problem.
[Small Device C Compiler](http://sdcc.sourceforge.net/) mógłby być idealnym wyborem,
gdyby wspierał używany przeze mnie procesor 8085. 
Co prawda prace nad dodaniem takiego wsparcia
rozpoczęły się [ponad rok temu](https://github.com/kenyapcomau/sdcc-8080), 
ale nie zaowocowały jeszcze w pełni działającym kompilatorem.
Warto dodać że procesor 8085 jest wstecznie kompatybilny z procesorem 8080
(dokładnie mówiąc 8085 dodaje tylko dwie nowe instrukcje), więc
kompilator C dla 8080 może być z powodzeniem wykorzystany również do 
generowania kodu dla 8085.

Ostatecznie postanowiłem użyć kompilatora [Small-C](https://github.com/ncb85/SmallC-85),
napisanego ponad 30 lat temu przez Chrisa Lewisa, a przywróconego do życia dzięki wysiłkom
użytkownika [ncb85](https://github.com/ncb85). `ncb85` oprócz kodu kompilatora
udostępnił też na swoim koncie [przykład jego użycia](https://github.com/ncb85/utilis-and-examples/tree/master/cpm_hello)
co pozwoliło mi zaoszczędzić niemało czasu.

Wracając do samego kompilatora, jest to dość stary program który powstał jeszcze przed
wprowadzeniem standardu C89 (sic!). Poniżej garść ciekawostek które się z tym wiążą:

* Nie ma typu `void`. Metody domyślnie zwracają typ `int`. :deal-with-it-parrot:
* Brak wsparcia dla inicjacji wartości zmiennych globalnych.
* Deklaracja metod musi byc wykonana w przestarzałym stylu [K&R](https://en.wikipedia.org/wiki/C_(programming_language)#K&R_C):

{% highlight c %}
lcd(regSelect, data)
    char regSelect;
    char data;
{
    // code
}
{% endhighlight %}
Współcześnie napisalibyśmy:
{% highlight c %}
void lcd(char regSelect, char data) {
    // code
}
{% endhighlight %}

Ponieważ nasz procesor jest 8-bitowy do dyspozycji mamy jedynie cztery typu liczb całkowitych:
`unsigned char`, `signed char`, `unsigned int` i `signed int`.
Operacje na 16-bitowych typach `int` muszą być symulowane za pomocą dostarczanej razem z kompilatorem
biblioteki [crun8085lib.asm](https://github.com/marcin-chwedczuk/mikrus-85/blob/master/smallC/crun8085lib.asm).

Sam kompilator jest bardzo prosty, nie generuje prawie żadnych ostrzeżeń - łatwo więc sobie strzelić w stopę.
Dla przykładu poniższa pętla jest nieskończona:
{% highlight c %}
char c;
for (c = 0; c < 128; c++) {
    // do nothing
}
{% endhighlight %}
Od czasu do czasu kompilator kończy pracę zgłaszając Segmentation Fault.
Praca z Small-C wymaga więc sporej dozy i cierpliwości, i wyrozumiałości, i wytrwałości.

Stworzenie najprostszego programu w C `main() { }` przy użyciu Small-C wymaga
trochę więcej wysiłku niż tylko uruchomienie kompilator. W wyniku kompilacji
otrzymujemy bowiem nie plik binary, ale plik źródłowy assemblera który
należy jeszcze poddać translacji do kodu maszynowego.
Do tego celu należy wykorzystać `as8085` będący częścią pakietu [ASxxxx](https://shop-pdp.net/ashtml/asxxxx.php).
`ASxxxx` jest wciąż rozwijanym projektem posiadającym naprawdę dobrą [dokumentację](https://shop-pdp.net/ashtml/asxbld.htm).
Dzięki temu zbudowanie assemblera ze źródeł nie powinno sprawić nam żadnych problemów.


