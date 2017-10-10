import os
import shutil
import mmap
from multiprocessing import Pool, Value

PATH = './svg-min'
BACKUP = './svg-raster'

def f(arg):
    i, filename = arg
    print(i)
    filepath = os.path.join(PATH, filename)
    f = open(filepath)
    if os.stat(filepath).st_size == 0:
        print('{} Error memoyy mapping {}. Remove it '.format(i, filename))
        os.remove(filepath)
        os.remove(filepath + '.txt')
    else:
        s = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        # if '<image ' in f.read():
        if s.find(b'<animate ') != -1:
            shutil.move(filepath, BACKUP)
            try:
                shutil.move(filepath + '.txt', BACKUP)
            except Exception as e:
                print(filepath + '.txt does not exist.')

            print('{}. Filtered out {}'.format(i, filename))

p = Pool(100)
p.map(f, list(enumerate([f for f  in os.listdir(PATH) if f.endswith('.svg')])))
