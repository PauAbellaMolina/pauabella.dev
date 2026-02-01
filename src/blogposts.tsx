import type { ReactNode } from 'react';

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  content: ReactNode;
}

const blogPosts: BlogPost[] = [
  {
    id: 'how-i-moved-to-copenhagen',
    title: 'moving to Copenhagen',
    date: 'January 2025',
    excerpt: 'Hi, my name is Pau, I am now 24 years old and have been living in Copenhagen for a year, this is the story of how I got here.',
    content: (
      <>
        <p>Hi, my name is Pau, I am now 24 years old and have been living in Copenhagen for a year, this is the story of how I got here.</p>

        <p>I was born and raised in Reus, a small town south of Barcelona. There's not much to do there, young people move to the big city very early and there's only big old corporations or very traditionally ran startups. Life is good tho! Very good weather, right by the sea, and a short drive away from the mountains. I love the Pyrenees!</p>

        <p>So what kept me there for 23 years? A mix of everything. I studied a pretty easy web development course which I finished at 20. Then I went on an internship at a random university in Lublin, Poland for two months. It was nice! I got a sneak peak at how cool Poland, and Europe is.</p>

        <p>Got back from that and started working at an e-mobility saas startup, a very cool place to work at, and I learned an insane amount of engineering. The CEO and CTO was extremely good, the best engineer I've ever met. On the other hand, it wasn't a very eager environment. It was very chill, business was growing at higher than market rates, there was no big VC investments to return the money back to, extremely flexible working schedule, always remote, and as-good-as-it-gets work-life balance. Salaries were also very good, well above average.</p>

        <p>Sounds like a good deal right? I was living on my own, had the van I always dreamt of, surfed often, went up to the mountains to ski in winter, spent long summers in the summerhouse with my friends, saw my family often… Well, too good of a deal!</p>

        <p>I want that good life in twenty years from now, but definitely not at 23! The cost of opportunity of staying was too big. So after three years, I decided to pull the trigger and leave that life behind.</p>

        <p>So, why not just move to Barcelona? Why Copenhagen? Pretty easy. It's the perfect balance of a cool and big startup scene, not too big of a city, bikeable everywhere, very good public transport system, extremely safe and one of the highest salaries possible in Europe. It really is the perfect balance. Barcelona has perfect weather but lacks in every other category.</p>

        <p>Finding a job was hard. This is not like moving between states in the US. Danes won't take the risk of hiring you, who doesn't speak the language, where they don't know the school you studied at, where you just moved here. So it's hard to find your first job, and it is what it is.</p>

        <p>I found a very hardcore startup. VC funded, extremely talented people, eager to grow big, hardcore. It was a rocky start in the beginning, not only because of the intensity of the new job, but also because of the drastic life turn I just took. But that's exactly what leaving the comfort zone is, and it's what I was looking for.</p>

        <p>So a year after. How are things now? Things are very good, I love my job, I pour my soul into it, and it's very fulfilling. The highs are high and the lows are low, and how lucky to be feeling it all in the job I've so many times dreamt of when going on runs while listening to startup stories.</p>

        <p>Copenhagen really is a very good place to live. I feel like I went from a place where things didn't quite work, in general, to a place where things work very well. People are optimistic, can save, buy houses, have kids relatively young, it feels extremely safe. There's not much important things to worry about, it's awesome!</p>

        <p>I encourage everyone to step out of the comfort zone, whatever that means to you. Just take the risk, go all in, pour your soul into your next move, identify what you need to put in effort into at every step and do it. It always pays off.</p>
      </>
    ),
  },
];

export default blogPosts;
